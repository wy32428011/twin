/**
 * API调试面板组件
 * @description 用于本地联调时显示状态和控制
 */
import React from "react";
import { Button, Switch, Space, Tag, message } from "antd";
import { getCurrentApiConfig, setApiConfig, isLocalDebug } from "@/services/config";
import { pageBackendSync } from "@/services/pageBackendSync";

export function ApiDebugPanel() {
  const [debugMode, setDebugMode] = React.useState(isLocalDebug());
  const [syncEnabled, setSyncEnabled] = React.useState(pageBackendSync.isSyncEnabled());
  const config = getCurrentApiConfig();

  const handleDebugModeChange = (checked: boolean) => {
    setApiConfig({ localDebug: checked });
    setDebugMode(checked);
    message.success(`本地联调模式已${checked ? "启用" : "禁用"}`);
  };

  const handleSyncEnabledChange = (checked: boolean) => {
    if (checked) {
      pageBackendSync.enableSync();
    } else {
      pageBackendSync.disableSync();
    }
    setSyncEnabled(checked);
    message.success(`后端同步已${checked ? "启用" : "禁用"}`);
  };

  const handleTestApi = async () => {
    try {
      message.loading("正在测试API连接...");
      const { getTreeData } = await import("@/services/bigScreenApi");
      const response = await getTreeData();
      if (response?.code === 200 || response?.success || Array.isArray(response)) {
        message.success("API连接成功");
      } else {
        message.warning("API返回异常数据");
      }
    } catch (error) {
      message.error("API连接失败: " + (error as Error).message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        background: "rgba(0,0,0,0.8)",
        padding: "12px 16px",
        borderRadius: 8,
        zIndex: 9999,
        fontSize: 12,
        color: "#fff",
      }}
    >
      <Space direction="vertical" size={8}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>API 调试面板</div>

        <Space>
          <span>本地联调:</span>
          <Switch
            size="small"
            checked={debugMode}
            onChange={handleDebugModeChange}
          />
          <Tag color={debugMode ? "green" : "red"}>
            {debugMode ? "ON" : "OFF"}
          </Tag>
        </Space>

        <Space>
          <span>后端同步:</span>
          <Switch
            size="small"
            checked={syncEnabled}
            onChange={handleSyncEnabledChange}
          />
          <Tag color={syncEnabled ? "blue" : "orange"}>
            {syncEnabled ? "ON" : "OFF"}
          </Tag>
        </Space>

        <div style={{ fontSize: 10, color: "#999" }}>
          <div>后端地址: {config.baseUrl}</div>
          <div>超时: {config.timeout}ms</div>
        </div>

        <Button size="small" onClick={handleTestApi}>
          测试API
        </Button>
      </Space>
    </div>
  );
}