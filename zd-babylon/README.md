# Zen Ding 3D Editor

基于 Babylon.js Editor 的 Electron 桌面端 3D 场景编辑器。

## MQTT 数字孪生

编辑器支持通过 MQTT 消息驱动数字孪生模型的实时运动和状态预览。

### 项目级连接配置

1. 打开编辑器后进入顶部菜单 **工程 → MQTT 设置...**。
2. 启用 MQTT，并填写 Broker URL，例如 `mqtt://localhost:1883`。
3. 可选填写 Client ID、用户名、运行时密码、重连间隔、连接超时。
4. 在“订阅 Topic”中按行填写项目级订阅 topic。
5. 如需在编辑态实时预览，启用“编辑态实时预览”。
6. 点击“应用连接”使当前配置生效。

支持的协议包括 `mqtt://`、`mqtts://`、`ws://`、`wss://`。运行时密码只保存在本次运行内存中，保存项目时不会写入项目文件；Broker URL 也不能包含用户名或密码，请改用用户名和运行时密码字段。

### 节点级映射

选中 Babylon 节点后，在 Inspector 的 **MQTT 数字孪生** 区域添加映射：

- `Topic`：接收消息的 topic。
- `Payload Path`：从 JSON payload 中取值的路径，例如 `position.x` 或 `state.color`；为空时使用整个 payload。
- `Target`：支持 `position`、`rotation`、`scaling`、`visibility`、`enabled`、`materialColor`、`animation`、`boneRotation`。
- `Axis`：用于 transform 或 bone rotation，可选 `x`、`y`、`z`、`all`。
- `Value Type`：支持 `number`、`boolean`、`string`、`vector3`、`color3`、`degrees`、`radians`。
- `Target Name`：用于材质颜色属性、AnimationGroup 名称、bone/transform node 名称等二级定位。
- `Scale` / `Offset`：用于数值转换，例如设备单位换算。

节点映射 topic 会在编辑态预览或 Play Mode runtime 启动时自动向主进程请求订阅；项目级 topic 列表仍可用于全局订阅。数字孪生映射不支持 MQTT wildcard（`#`、`+`），并会限制 topic 数量、topic 长度和单条 payload 大小，避免错误配置或异常消息拖慢编辑器。

### 示例消息

```json
{"position":{"x":1,"y":2,"z":3}}
```

当映射配置为 `Payload Path = position`、`Target = position`、`Axis = all`、`Value Type = vector3` 时，上述消息会把节点移动到 `(1, 2, 3)`。

```json
{"angle":90,"color":{"r":1,"g":0,"b":0},"enabled":true}
```

可分别映射到旋转角度、材质颜色和启用状态。`degrees` 会自动转换为 Babylon.js 使用的弧度。

### 保存行为

编辑态 MQTT 实时值只用于临时预览，不会自动固化到场景文件或自动导出产物。保存和自动导出期间会暂停编辑态 MQTT preview runtime，完成后再恢复；保存项目时会保存 MQTT 非敏感配置和节点 metadata 映射，但不会保存运行时密码。
