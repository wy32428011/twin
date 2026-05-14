
import { dirname, join } from "path/posix";
import { ipcRenderer, shell } from "electron";

import { Component, ReactNode } from "react";

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../ui/shadcn/ui/menubar";

import { isDarwin } from "../../tools/os";
import { execNodePty } from "../../tools/node-pty";
import { openSingleFileDialog } from "../../tools/dialog";

import { showConfirm } from "../../ui/dialog";
import { ToolbarComponent } from "../../ui/toolbar";

import { saveProject } from "../../project/save/save";
import { startProjectDevProcess } from "../../project/run";
import { exportProject } from "../../project/export/export";

import { Editor } from "../main";
// import { getNodeCommands } from "../dialogs/command-palette/node";
// import { getMeshCommands } from "../dialogs/command-palette/mesh";
// import { getLightCommands } from "../dialogs/command-palette/light";
// import { getCameraCommands } from "../dialogs/command-palette/camera";
// import { getSpriteCommands } from "../dialogs/command-palette/sprite";
// import { ICommandPaletteType } from "../dialogs/command-palette/command-palette";

export interface IEditorToolbarProps {
  editor: Editor;
}

export class EditorToolbar extends Component<IEditorToolbarProps> {
  // private _nodeCommands: ICommandPaletteType[];
  // private _meshCommands: ICommandPaletteType[];
  // private _lightCommands: ICommandPaletteType[];
  // private _cameraCommands: ICommandPaletteType[];
  // private _spriteCommands: ICommandPaletteType[];

  public constructor(props: IEditorToolbarProps) {
    super(props);

    ipcRenderer.on("editor:open-project", () => this._handleOpenProject());
    ipcRenderer.on("editor:open-vscode", () => this._handleOpenVisualStudioCode());

    // this._nodeCommands = getNodeCommands(this.props.editor);
    // this._meshCommands = getMeshCommands(this.props.editor);
    // this._lightCommands = getLightCommands(this.props.editor);
    // this._cameraCommands = getCameraCommands(this.props.editor);
    // this._spriteCommands = getSpriteCommands(this.props.editor);

    // const commands = [...this._nodeCommands, ...this._meshCommands, ...this._lightCommands, ...this._cameraCommands, ...this._spriteCommands];

    // commands.forEach((command) => {
    //   ipcRenderer.on(`add:${command.ipcRendererChannelKey}`, command.action);
    // });
  }

  public render(): ReactNode {
    return (
      <>
        {isDarwin() && <div className="absolute top-0 left-0 w-screen h-10 electron-draggable" />}

        {(!isDarwin() || process.env.DEBUG || process.env.DEBUG_BUILD) && this._getToolbar()}
      </>
    );
  }

  private _getToolbar(): ReactNode {
    return (
      <ToolbarComponent>
        <Menubar className="border-none rounded-none pl-3 my-auto">
          {/* <img alt="" src="assets/babylonjs_icon.png" className="w-6 object-contain" /> */}

          {/* 文件 */}
           <MenubarMenu>
            <MenubarTrigger>文件</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem onClick={() => this._handleOpenProject()}>
                打开项目 <MenubarShortcut>CTRL+O</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => saveProject(this.props.editor)}>
                保存 <MenubarShortcut>CTRL+S</MenubarShortcut>
              </MenubarItem>

              <MenubarItem onClick={() => exportProject(this.props.editor, { optimize: true })}>
                生成 <MenubarShortcut>CTRL+G</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem disabled={!this.props.editor.state.visualStudioCodeAvailable} onClick={() => this._handleOpenVisualStudioCode()}>
                在 VS Code 中打开
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => startProjectDevProcess(this.props.editor)}>运行项目...</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* 编辑 */}
          <MenubarMenu>
            <MenubarTrigger>编辑</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem>
                撤销 <MenubarShortcut>CTRL+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                重做 <MenubarShortcut>CTRL+Y</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem>
                全选 <MenubarShortcut>CTRL+A</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                复制 <MenubarShortcut>CTRL+C</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                粘贴 <MenubarShortcut>CTRL+V</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => this.props.editor.setState({ editProject: true })}>项目设置...</MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => this.props.editor.setState({ editPreferences: true })}>首选项...</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Preview */}
          {/* <MenubarMenu>
            <MenubarTrigger>Preview</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("position")}>
                Position <MenubarShortcut>CTRL+T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("rotation")}>
                Rotation <MenubarShortcut>CTRL+R</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("scaling")}>
                Scaling <MenubarShortcut>CTRL+W</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => this.props.editor.layout.preview.focusObject()} className="w-60">
                Focus Selected Object <MenubarShortcut>CTRL+F</MenubarShortcut>
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera)}>
                Edit Camera
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem onClick={() => this.props.editor.layout.preview.play.triggerPlayScene()}>Play Scene</MenubarItem>
            </MenubarContent>
          </MenubarMenu> */}

          {/* Add */}
          {/* <MenubarMenu>
            <MenubarTrigger>Add</MenubarTrigger>
            <MenubarContent className="border-black/50">
              {this._nodeCommands.map((command) => (
                <MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
                  {command.text}
                </MenubarItem>
              ))}
              <MenubarSeparator />
              {this._meshCommands.map((command) => (
                <MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
                  {command.text}
                </MenubarItem>
              ))}
              <MenubarSeparator />
              {this._lightCommands.map((command) => (
                <MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
                  {command.text}
                </MenubarItem>
              ))}
              <MenubarSeparator />
              {this._cameraCommands.map((command) => (
                <MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
                  {command.text}
                </MenubarItem>
              ))}
              <MenubarSeparator />
              {this._spriteCommands.map((command) => (
                <MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
                  {command.text}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu> */}

          {/* 工程 */}
          <MenubarMenu>
            <MenubarTrigger>工程</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem onClick={() => this.props.editor.setState({ editMqtt: true })}>MQTT 设置...</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={() => saveProject(this.props.editor)}>
                同步 <MenubarShortcut>CTRL+SHIFT+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={() => exportProject(this.props.editor, { optimize: true })}>
                发布 <MenubarShortcut>CTRL+SHIFT+P</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* 窗口 */}
          <MenubarMenu>
            <MenubarTrigger>窗口</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem onClick={() => ipcRenderer.send("window:minimize")}>
                最小化 <MenubarShortcut>CTRL+M</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={() => this.props.editor.close()}>
                关闭 <MenubarShortcut>CTRL+W</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* 帮助 */}
          <MenubarMenu>
            <MenubarTrigger>帮助</MenubarTrigger>
            <MenubarContent className="border-black/50">
              <MenubarItem onClick={() => shell.openExternal("")}>编辑器文档...</MenubarItem>
              {/* <MenubarItem onClick={() => shell.openExternal("https://doc.babylonjs.com")}>Babylon.js 文档...</MenubarItem> */}
              <MenubarSeparator />
              {/* <MenubarItem onClick={() => shell.openExternal("https://forum.babylonjs.com")}>Babylon.js 论坛...</MenubarItem> */}
              {/* <MenubarSeparator /> */}
              <MenubarItem onClick={() => shell.openExternal("")}>报告问题...</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </ToolbarComponent>
    );
  }

  private async _handleOpenProject(): Promise<void> {
    const file = openSingleFileDialog({
      title: "打开项目",
      filters: [{ name: "Babylon.js Editor 项目文件", extensions: ["bjseditor"] }],
    });

    if (!file) {
      return;
    }

    const accept = await showConfirm("确定要执行此操作吗？", "这将关闭当前项目并打开所选项目。");
    if (!accept) {
      return;
    }

    await this.props.editor.layout.preview.reset();
    await this.props.editor.openProject(file);
  }

  private async _handleOpenVisualStudioCode(): Promise<void> {
    if (!this.props.editor.state.projectPath) {
      return;
    }

    const p = await execNodePty(`code "${join(dirname(this.props.editor.state.projectPath), "/")}"`);
    await p.wait();
  }
}
