import { dirname } from "path/posix";
import { writeJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { toast } from "sonner";

import packageJson from "../../../package.json";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";
import { sanitizeMqttConfigurationForSave } from "../../tools/mqtt/configuration";

import { exportProject } from "../export/export";

import { projectsKey } from "../../tools/project";
import { onProjectSavedObservable } from "../../tools/observables";
import { getBase64SceneScreenshot } from "../../tools/scene/screenshot";
import { tryGetProjectsFromLocalStorage } from "../../tools/local-storage";

import { saveScene } from "./scene";
import { EditorSaveProjectProgressComponent } from "./progress";

let saving = false;

export async function saveProject(editor: Editor): Promise<void> {
  if (saving) {
    return;
  }

  saving = true;

  try {
    await _saveProject(editor);
  } catch (e) {
    if (e instanceof Error) {
      editor.layout.console.error(`Error saving project:\n ${e.message}`);
      toast.error("保存项目失败");
    }
  } finally {
    saving = false;
  }
}

export async function saveProjectConfiguration(editor: Editor) {
  const project: Partial<IEditorProject> = {
    plugins: editor.state.plugins.map((plugin) => ({
      nameOrPath: plugin,
    })),
    version: packageJson.version,
    packageManager: editor.state.packageManager,
    lastOpenedScene: editor.state.lastOpenedScenePath?.replace(dirname(editor.state.projectPath!), ""),

    compressedTexturesEnabled: editor.state.compressedTexturesEnabled,
    compressedTexturesEnabledInPreview: editor.state.compressedTexturesEnabledInPreview,
    mqtt: sanitizeMqttConfigurationForSave(editor.state.mqtt),
  };

  if (!editor.props.editedScenePath) {
    await writeJSON(editor.state.projectPath!, project, {
      spaces: 4,
    });
  }

  return project;
}

async function _saveProject(editor: Editor) {
  if (!editor.state.projectPath) {
    return;
  }

  const toastId = toast(<EditorSaveProjectProgressComponent />, {
    duration: Infinity,
    dismissible: false,
  });

  const directory = dirname(editor.state.projectPath);
  const project = await saveProjectConfiguration(editor);
  const restartMqttTwinPreview = editor.state.mqtt.enabled && editor.state.mqtt.enableEditorPreview;
  editor.layout.preview.stopMqttTwinPreview();

  try {
    if (editor.state.lastOpenedScenePath) {
      editor.layout.console.log(`正在保存项目 "${project.lastOpenedScene}"`);
      await saveScene(editor, directory, editor.state.lastOpenedScenePath);
      editor.layout.console.log(`项目 "${project.lastOpenedScene}" 已保存。`);
    }

    editor.layout.preview.setRenderScene(true);

    toast.dismiss(toastId);
    toast.success("项目已保存");

    if (!editor.props.editedScenePath) {
      try {
        const base64 = await getBase64SceneScreenshot(editor.layout.preview.scene);

        const projects = tryGetProjectsFromLocalStorage();
        const project = projects.find((project) => project.absolutePath === editor.state.projectPath);
        if (project) {
          project.preview = base64;
          project.updatedAt = new Date();

          localStorage.setItem(projectsKey, JSON.stringify(projects));
          ipcRenderer.send("dashboard:update-projects");
        }
      } catch (e) {
        // Catch silently.
      }
    }

    try {
      onProjectSavedObservable.notifyObservers();
    } catch (e) {
      // Catch silently.
    }

    await exportProject(editor, {
      optimize: false,
      noProgress: false,
      noDialog: true,
    });
  } finally {
    if (restartMqttTwinPreview) {
      editor.layout.preview.startMqttTwinPreview();
    }
  }
}
