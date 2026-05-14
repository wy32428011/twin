# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作提供指导。

## 项目概览

Zen Ding 3D Editor 是一个基于 Electron 和 Babylon.js 8.41.0 的桌面应用。上游 README 仅说明“基于 Babylon.js Editor”；本仓库在此基础上提供可视化 3D 场景编辑器，包含 flexlayout-react 停靠式布局、资源管理、项目保存/加载/导出流程、插件机制，以及 Electron 打包和更新脚本。

## 常用命令

```bash
yarn build            # TypeScript 类型检查/编译，并将 Tailwind CSS 构建到 build/index.css
yarn watch            # 仅监听 TypeScript；不会重建 CSS
yarn watch-css        # 仅监听 Tailwind CSS
yarn start            # 以开发模式运行 Electron
yarn package          # 清理、构建，并通过 scripts/build.mjs 打包 stable/dev 两套 Electron 安装包
yarn lint             # 对 src/** 运行带缓存的 ESLint
yarn lint-fix         # 运行 ESLint 并应用自动修复
yarn clean            # 删除 build/、declaration/、electron-packages/
yarn release:patch    # 通过 scripts/release.mjs 发布 patch 版本
yarn release:minor    # 通过 scripts/release.mjs 发布 minor 版本
yarn release:major    # 通过 scripts/release.mjs 发布 major 版本
yarn changelog        # 生成/更新变更日志内容
```

`package.json` 当前没有配置测试运行器或 `yarn test` 脚本。验证改动时使用 `yarn build` 和 `yarn lint`；除非先加入测试框架，否则不要编造单测命令。

**DevTools**：`Ctrl+Alt+I` 会打开 8315 端口的远程调试。

**WebGPU**：由于 `WebGPUEngine.IsSupportedAsync` 仍有未解决的问题，目前禁用 WebGPU。

## 构建与 TypeScript

- **入口**：`src/index.ts` 是 Electron 主进程入口，`index.html` 是渲染进程外壳。
- **输出**：`build/src/index.js`，由 `package.json` 的 `"main"` 字段驱动。
- **tsconfig**：使用 CommonJS 模块、`ESNext` 目标、`react-jsx`，声明文件输出到 `declaration/`，并启用 `strictNullChecks`、`noUnusedLocals`、`noUnusedParameters`。
- **CSS**：Tailwind CSS 3.4.4 读取 `index.css` 并输出 `build/index.css`。`tailwind.config.js` 扫描 `src/**/*.{html,ts,tsx,js,jsx}`，使用 `darkMode: ["class"]`、CSS 变量和 `tailwindcss-animate`。
- **Lint**：`eslint.config.mjs` 作用于 `src/**/*.{ts,mts,tsx}`，使用 `@typescript-eslint/parser`，接口名要求以 `I` 开头，私有成员要求前导 `_`，枚举成员使用 `PascalCase`。

## 架构

### 顶层模块

| 模块 | 路径 | 职责 |
|------|------|------|
| **dashboard** | `src/dashboard/` | 首页，用于创建/打开项目 |
| **editor** | `src/editor/` | 核心编辑器 UI：布局、预览、场景树、属性面板、菜单 |
| **project** | `src/project/` | 项目管理：保存、加载、导出、配置 |
| **editor-tools** | `src/editor-tools/` | Inspector 字段装饰器、镜头工具、动画辅助、脚本加载 |
| **tools** | `src/tools/` | 共享工具：类型守卫、物理、场景工具、worker、撤销/重做 |
| **electron** | `src/electron/` | IPC 事件处理、窗口/对话框、node-pty 终端 |
| **ui** | `src/ui/` | 共享 UI 组件：shadcn/radix primitives 与 BlueprintJS 包装组件 |
| **loader** | `src/loader/` | 资源加载器：assimp、mesh、material、texture、animation |

### 编辑器布局（`src/editor/layout/`）

编辑器使用 **flexlayout-react** 实现停靠式布局，主要面板包括：

- **Preview**（`preview.tsx`）：Babylon.js 渲染画布，包含 gizmo 和 play mode。
- **Graph**（`graph.tsx`）：场景层级树。
- **Inspector**（`inspector.tsx`）：选中对象的属性编辑器。
- **Assets Browser**：项目资源管理。
- **Console**：日志输出。

布局会以 JSON 形式序列化到 `localStorage`。

### UI 技术栈

UI 采用混合方案：

- **BlueprintJS**：`Tree`、`Button`、`HotkeysTarget2`，主要用于场景树和工具栏。
- **shadcn/radix primitives**：`src/ui/shadcn/ui/` 中的自定义组件，用于 dialog、dropdown、context menu、form 等。
- **Tailwind CSS**：通过 utility class 和 `dark` class 实现主题切换。
- **React Icons**：使用 `react-icons`（Fa、Io、Lu、Gi 等）提供图标。

### 项目磁盘结构

```text
project/
├── project.json          # 编辑器配置：plugins、package manager、last scene
└── scenes/
    └── sceneName/
        ├── config.json   # 场景设置
        ├── meshes/       # 单个 mesh JSON 文件
        ├── nodes/        # TransformNode
        ├── lights/, cameras/, geometries/
        ├── particleSystems/, animationGroups/
        └── preview.png   # 缩略图
```

### 入口流程

1. Electron 主进程从 `src/index.ts` 启动，并通过 `index.html` 加载渲染进程。
2. 应用首先创建 **Dashboard window**（`createDashboardWindow`），用于最近项目、项目创建和项目打开。
3. 从 dashboard 打开项目时会创建 **Editor window**（`createEditorWindow`）。
4. 渲染进程调用 `src/editor/main.tsx` 中的 `createEditor()`，等待 `EditorLayout` 和 preview scene 就绪后，通过 `loadProject()` 加载项目。
5. 可以同时打开多个编辑器窗口；dashboard 状态通过 `dashboard:opened-projects`、`dashboard:update-projects` 等 IPC 事件同步。

**Context Isolation**：`nodeIntegration: true`，但 `contextIsolation` 仅在 DEBUG 模式下为 `false`。生产环境启用 context isolation，并通过 IPC 进行主进程/渲染进程通信。

### 关键模式

**Babylon.js 节点扩展** — 编辑器通过以下方式扩展 Babylon 类：

1. 对已有类进行 module augmentation，以附加 metadata。
2. 使用自定义类继承 Babylon 类，例如 `EditorCamera extends FreeCamera`。
3. 在 `src/editor/main.tsx` 中通过 `Node.AddNodeConstructor()` 注册节点构造器。

**类型守卫**（`src/tools/guards/`）— 使用 `getClassName()` 做运行时类型判断：

```typescript
export function isMesh(object: any): object is Mesh {
  switch (object.getClassName?.()) {
    case "Mesh": case "GroundMesh": return true;
  }
  return false;
}
```

**撤销/重做**（`src/tools/undoredo.ts`）— 操作通过 `registerUndoRedo()` 包装。

**IPC 通信** — Electron 主进程负责窗口管理、文件对话框以及 dashboard/editor 通信，例如 `dashboard:opened-projects`。

**序列化** — 使用 Babylon.js 内置 `Serialize()` 方法，并通过自定义 `metadata` 保存编辑器专属数据。父级引用以 `uniqueId` 保存，之后延迟解析。

**项目保存/加载** — `loadProject()` 读取 `project.json`、安装/更新项目依赖、加载插件，然后加载最后打开的场景。`saveProject()` 写入项目配置，将场景序列化委托给 `saveScene()`，更新 `localStorage` 中的 dashboard preview，通知 `onProjectSavedObservable`，随后执行一次无对话框导出。

**Mesh metadata 与 meta.json** — 导入的 mesh 使用 `metadata.scripts` 保存挂载脚本。导入时读取资源目录下的 `meta.json`，并通过 `SerializationHelper.ParseProperties()` 合并。这样可以在重新导入时保留每个 mesh 的配置，例如 position、rotation、scaling override。

**Observables**（`src/tools/observables.ts`）— 集中管理跨模块事件的 Babylon.js `Observable`，例如节点新增、节点修改、纹理新增等。

**Inspector 注册** — Inspector 类实现静态方法 `IsSupported(object)`，并注册到 `EditorInspector._inspectors` 数组。选中对象后，渲染第一个 `IsSupported` 返回 `true` 的 Inspector。

### Play Mode 与脚本编译

Play mode 使用 **esbuild** 将项目的 `src/scripts.ts` 编译到临时目录：

- 将 `@babylonjs/*` import 替换为 `babylonjs`、`babylonjs-gui` 等。
- 输出 `.cjs` 以强制使用 CommonJS，避免项目设置 `type: "module"` 时出现 ESM 问题。
- 将 `babylonjs*` 和 `electron` 设为 external dependency。
- 通过 `chokidar` watcher 支持脚本热重载。

`EditorPlay`（`src/editor/layout/preview/editorPlay.ts`）管理非播放状态下的脚本生命周期。`EditorPreviewPlayComponent`（`src/editor/layout/preview/play.tsx`）管理真正 play mode scene。

**Play Overrides**（`src/tools/scene/play/override.tsx`）— Play mode 启动时会 patch 全局方法，例如 `fetch`、`setTimeout`、`console.log`、`WebRequest`、`Engine.createTexture` 等，用于沙箱化运行中的游戏逻辑，并在停止时清理。

### 导出流程

`exportProject()`（`src/project/export/export.tsx`）负责将场景序列化为运行时部署格式：

- 使用 `SceneSerializer` 导出场景数据。
- 处理资源，例如复制纹理、提取 node-material 纹理。
- 配置 LOD、physics aggregate、material。
- 通过 `handleExportScripts()` 处理脚本。
- 写入二进制 geometry 和 morph target。

### Scene Link Nodes

`SceneLinkNode`（`src/editor/nodes/scene-link.ts`）是一个 `TransformNode`，用于把另一个场景文件加载为子内容，实现模块化场景组合。它通过 `loadedScenes` 追踪并检测循环引用。

### 渲染管线

编辑器支持多种按相机配置的 post-process/rendering pipeline：

- VLS（Volumetric Light Scattering）
- SSR（Screen Space Reflections）
- SSAO2（Screen Space Ambient Occlusion）
- Motion Blur
- Default Rendering Pipeline（tonemapping、bloom 等）
- IBL Shadows

每条管线都保存相机级配置，并提供 `parse*`、`dispose*`、`serialize*` 函数。

### node-pty

用于启动项目的开发进程，也就是集成终端能力。相关代码见 `src/electron/node-pty.ts` 和 `src/project/run/`。

### MQTT 数字孪生

MQTT 数字孪生采用“主进程连接 broker，渲染进程应用 Babylon 场景映射”的分层方式：

- 主进程事件在 `src/electron/events/mqtt.ts`，负责 `mqtt:connect`、`mqtt:disconnect`、`mqtt:subscribe`、`mqtt:publish`，并把 `mqtt:message`、`mqtt:status`、`mqtt:error` 转发回对应 editor window。
- 项目级配置在 `editor.state.mqtt`，默认值、归一化和保存脱敏逻辑在 `src/tools/mqtt/configuration.ts`。保存项目时必须继续确保 `password` 不写入项目文件。
- 节点级映射保存在 Babylon 节点 `metadata.mqttTwin`，Inspector 实现在 `src/editor/layout/inspector/mqtt/mqtt.tsx`。
- runtime 在 `src/tools/mqtt/runtime.ts`，启动时扫描当前 scene 的节点映射，自动向主进程请求订阅映射 topic，并在 `onBeforeRenderObservable` 中按最新消息逐帧应用。
- 编辑态预览由 `src/editor/layout/preview.tsx` 管理，Play Mode 运行态由 `src/editor/layout/preview/play.tsx` 管理；切换/停止场景时必须停止 runtime，避免监听 disposed scene。
- payload 解析和各类映射应用器在 `src/tools/mqtt/`：transform、visual、animation、skeleton 分文件维护。
- 编辑态 MQTT 实时值只能作为临时预览，不应写入 undo/redo，也不应自动固化到场景保存结果或自动导出产物；保存/导出期间要保持 preview runtime 停止，完成后再恢复。
- MQTT 连接必须拒绝 URL 内联凭据，保存项目必须移除 `password` 和 URL username/password。映射 topic 不支持 wildcard，并要限制 topic 数量、长度和 payload 大小。
- `runtime.ts` 对每个 binding 的 message sequence 必须做到“处理一次即记账”，即使映射失败也不能在后续帧重复处理同一条坏消息。

验证 MQTT 相关改动时，至少运行：

```bash
yarn build
node --test tests/mqtt/*.test.cjs
yarn lint
```

**新增节点类型**：创建 `src/editor/nodes/your-node.ts`，继承某个 Babylon 类，并在 `editor/main.tsx` 中引入。

**新增面板**：添加到 `EditorLayout._components`，并在布局序列化中定义。

**新增资源类型**：在 `src/loader/` 中添加 loader，并在 `project/save/scene.ts` / `project/load/scene.ts` 中添加处理逻辑。

**插件系统**：在 `project.json` 的 `plugins` 中声明。插件会被 `require()`，并接收 `main(editor)` 以扩展编辑器能力。

**打包**：`yarn build` 后由 `scripts/build.mjs` 驱动 `electron-builder`，同时构建 stable 和 dev 安装包，写入更新 manifest，并输出到 `electron-packages/` 与 `electron-packages/dev/`。
