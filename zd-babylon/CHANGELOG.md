# 更新日志

本文件记录 ZENDING Editor 各版本的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.1] — 2026-05-09

### 修复
- gizmo 操作克隆体时 Inspector 空间信息同步更新
- 删除节点时 clone 纳入 undo/redo，修复 context menu 幽灵点击
- 重构脚本热重载调用链路，修复脚本实例泄漏

### 杂项
- 自动化版本发布流程
- 将脚本文件集中到 scripts/ 目录
- 新增 CHANGELOG.md 及自动生成脚本

### 新增
- 货格布局器网格边编辑与持久化
- 新增 POI 库面板，支持模型产生器和货格布局器

## [0.2.0] — 2026-04-23

### 新增
- 打包时额外生成开发版 app (ZENDING Editor Dev)

### 变更
- 移除场景中相机、光源、声音的 3D 图标

## [0.1.0] — 2026-04-22

### 新增
- 基于 Electron + Babylon.js 的 3D 场景编辑器
- Docker 停靠式布局（flexlayout-react），支持预览、场景树、属性面板、资源管理、控制台
- 脚本系统：esbuild 编译、Inspector 字段绑定、Play 模式、非播放模式预览
- 工程管理：创建/打开/保存/导出
- 变换 Gizmo、右键菜单、Hover 高亮、聚焦、阵列克隆
- 克隆体编辑模型与原模型双向同步
- Graph 侧边栏过滤编辑克隆体，选中自动指向原始模型
- 导出时过滤编辑器克隆体，恢复原始模型 enabled 状态

### 语言
- 全面汉化 UI（菜单栏、工具栏、Inspector、Graph）

### 修复
- 阵列克隆使用模型根节点、增量命名、恢复子节点原始名称
- Hover 高亮覆盖模型全部子 mesh
- 排除 ground/sky 的交互
- TS 严格模式类型修复
