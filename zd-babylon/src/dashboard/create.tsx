import { join } from "path/posix";
import { ipcRenderer } from "electron";
import { readJSON, remove, writeJSON } from "fs-extra";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { useState } from "react";

import { Grid } from "react-loader-spinner";

import { showAlert, showConfirm } from "../ui/dialog";

import { Input } from "../ui/shadcn/ui/input";
import { Button } from "../ui/shadcn/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { openSingleFolderDialog } from "../tools/dialog";
import { tryAddProjectToLocalStorage } from "../tools/local-storage";

import { IEditorProject, EditorProjectTemplate } from "../project/typings";
import { isPackageManagerAvailable } from "../tools/process";

export interface IDashboardCreateProjectDialogProps {
  isOpened: boolean;
  closeDashboardOnProjectOpen: boolean;
  onClose: () => void;
}

export function DashboardCreateProjectDialog(props: IDashboardCreateProjectDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [destination, setDestination] = useState("");
  const template: EditorProjectTemplate = "vanillajs";
  const [creating, setCreating] = useState(false);

  async function handleBrowseFolderPath() {
    const folder = openSingleFolderDialog("选择项目的创建地址");

    if (folder) {
      setDestination(folder);
    }
  }

  async function setupTemplate(destination: string, template: EditorProjectTemplate) {
    const templatePath = process.env.DEBUG ? `templates/${template}.tgz` : `../../templates/${template}.tgz`;
    const templateBlob = await fetch(templatePath).then((r) => r.blob());
    const buffer = Buffer.from(await templateBlob.arrayBuffer());

    await decompress(buffer, destination, {
      plugins: [decompressTargz()],
      map: (file) => {
        file.path = file.path.replace("package/", "");
        return file;
      },
    });

    await remove(join(destination, "package"));

    const projectAbsolutePath = join(destination, "project.bjseditor");

    const projectContent = (await readJSON(projectAbsolutePath)) as IEditorProject;
    projectContent.packageManager = (await isPackageManagerAvailable("yarn")) ? 'yarn' : 'npm';
    await writeJSON(projectAbsolutePath, projectContent, {
      spaces: "\t",
      encoding: "utf-8",
    });
  }

  async function handleCreateProject() {
    setCreating(true);

    try {
      const projectAbsolutePath = join(destination, "project.bjseditor");

      await setupTemplate(destination, template);

      tryAddProjectToLocalStorage(projectAbsolutePath);

      props.onClose();

      const result = await showConfirm("打开项目？", "是否想要打开刚创建的项目？", {
        cancelText: "否",
        confirmText: "是",
      });

      if (result) {
        ipcRenderer.send("dashboard:open-project", projectAbsolutePath, props.closeDashboardOnProjectOpen);
      }
    } catch (e) {
      showAlert("发生未知错误", e.message);
    }

    setCreating(false);
    setDestination("");
  }

  return (
    <Dialog open={props.isOpened} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>关联项目</DialogTitle>
          <div className="flex flex-col gap-4 py-5">
            {!creating && (
              <>
                <div className="flex flex-col gap-2">
                  <div>输入项目id</div>

                  <div className="flex gap-[10px]">
                    <Input value={projectId} placeholder="关联项目id..." onChange={(e) => setProjectId(e.currentTarget.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div>选择项目存储路径</div>

                  <div className="flex gap-[10px]">
                    <Input value={destination} disabled placeholder="文件夹路径..." />
                    <Button variant="secondary" className="w-24" onClick={() => handleBrowseFolderPath()}>
                      浏览...
                    </Button>
                  </div>
                </div>
              </>
            )}

            {creating && (
              <div className="flex flex-col gap-[10px] justify-center items-center pt-5">
                <Grid width={24} height={24} color="#ffffff" />

                <div>创建项目中...</div>
              </div>
            )}
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="default" className="w-24" onClick={() => handleCreateProject()} disabled={destination === "" || creating}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
