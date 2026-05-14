import { IEditorProjectMqttConfiguration } from "../tools/mqtt/types";

export interface IEditorProject {
  /**
   * 保存该项目的编辑器版本。
   */
  version: string;
  /**
   * 上次打开的场景路径。
   */
  lastOpenedScene: string | null;

  /**
   * 项目插件列表。
   */
  plugins: IEditorProjectPlugin[];

  /**
   * 是否启用 PVRTexTool 压缩纹理。
   */
  compressedTexturesEnabled: boolean;
  /**
   * 是否在预览中启用压缩纹理。
   */
  compressedTexturesEnabledInPreview: boolean;

  /**
   * 项目使用的包管理器。
   */
  packageManager?: EditorProjectPackageManager;

  /**
   * MQTT 数字孪生项目配置，不包含持久化密码。
   */
  mqtt?: IEditorProjectMqttConfiguration;
}

export interface IEditorProjectPlugin {
  /**
   * 插件名称或路径。
   */
  nameOrPath: string;
}

export type EditorProjectPackageManager = "npm" | "yarn" | "pnpm" | "bun";

export type EditorProjectTemplate = "nextjs" | "solidjs" | "vanillajs" | "electron";
