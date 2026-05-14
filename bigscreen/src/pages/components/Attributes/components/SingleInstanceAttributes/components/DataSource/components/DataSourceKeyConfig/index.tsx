/**
 * 数据源配置
 * @description 支持静态数据、单组件API、组合模式（页面级请求）三种数据源
 * @description 底部展示三个Tab: 数据模板、原始数据、处理后数据
 */
import { IInput } from "@/components/Attributes";
import { Button, Switch, Collapse, Modal, Select, Tabs, message, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined, DownloadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import CodeEditor from "@/components/CodeEditor";
import { useSingleSelectedInstance } from "@/pages/components/Attributes/components/SingleInstanceAttributes";
import { useCurrentPage } from "@/engine";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./style.module.less";
import { dataSourceRegistry, useDataSourceStore } from "@/packages/dataSource";
import { RbsEngine } from "@/export";

interface Props {
  style?: React.CSSProperties;
}

// Key-Value 编辑项
interface KeyValueItem {
  key: string;
  value: string;
}

const { Panel } = Collapse;

// Tab key 类型
type TabKey = "template" | "raw" | "processed";

export default function DataSourceConfig(props: Props) {
  const engine = RbsEngine.getActiveEngine();
  const { componentNode } = useSingleSelectedInstance();
  const page = useCurrentPage();
  const dataSourceType = componentNode?.dataSourceType || "static";
  const pageDataSourceKey = componentNode?.pageDataSourceKey || "";
  const pageDataSources = page?.options?.pageDataSources || [];
  const dataMap = useDataSourceStore((state) => state.dataMap);

  // 当前选中的 Tab
  const [activeTab, setActiveTab] = useState<TabKey>("template");

  // 单组件 API 请求配置（dataSourceKey 模式）
  const dataSourceKey = componentNode?.dataSourceKey || "";
  const currentData = dataSourceType === "combined"
    ? pageDataSourceKey ? dataMap?.[pageDataSourceKey] : undefined
    : dataSourceKey ? dataMap?.[dataSourceKey] : undefined;

  // 请求配置
  const request = componentNode?.request || {};
  const [headers, setHeaders] = useState<KeyValueItem[]>([{ key: "", value: "" }]);
  const [params, setParams] = useState<KeyValueItem[]>([{ key: "", value: "" }]);
  const [dataFilter, setDataFilter] = useState<string>(() => componentNode?.request?.dataFilter || "(data) => data");

  // 静态数据
  const [staticData, setStaticData] = useState<string>("");

  // 原始数据编辑弹窗（仅静态数据模式下使用）
  const [staticDataModalVisible, setStaticDataModalVisible] = useState(false);
  const [staticDataEditingValue, setStaticDataEditingValue] = useState<string>("");

  // 过滤器编辑弹窗
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterEditingValue, setFilterEditingValue] = useState(dataFilter);

  // 手动请求 loading 状态
  const [manualRequestLoading, setManualRequestLoading] = useState(false);

  // 获取组件注册的数据模板（staticDataSource）
  const componentTemplate = useMemo(() => {
    const cId = componentNode?.cId;
    if (!cId) return null;
    // 从引擎的组件模板中获取
    const registered = engine?.component?.get(cId);
    return registered?.staticDataSource || null;
  }, [componentNode?.cId, engine]);

  // 从 request 配置初始化
  useEffect(() => {
    setHeaders([{ key: "", value: "" }]);
    setParams([{ key: "", value: "" }]);
    setStaticData("");
    setDataFilter("(data) => data");

    if (request.headers?.length) {
      setHeaders(request.headers.map((h: any) => ({ key: h.key || "", value: h.value || "" })));
    }
    if ( request.params?.length) {
      setParams(request.params.map((p: any) => ({ key: p.key || "", value: p.value || "" })));
    }
    if (request.dataFilter) {
      setDataFilter(request.dataFilter);
    }

    // 静态数据模式下，从 staticDataSource 读取
    if (dataSourceType === "static" && componentNode?.staticDataSource !== undefined) {
      setStaticData(
        typeof componentNode.staticDataSource === "string"
          ? componentNode.staticDataSource
          : JSON.stringify(componentNode.staticDataSource, null, 2)
      );
    }
  }, [componentNode?.id, dataSourceType, componentNode?.staticDataSource]);

  // 更新 componentNode
  const updateNode = useCallback((updates: any) => {
    engine?.componentNode?.update?.(componentNode?.id, (config) => ({
      ...updates,
      request: updates.request !== undefined ? { ...(config.request || {}), ...updates.request } : config.request,
    }));
  }, [componentNode?.id, engine]);

  // 更新静态数据
  const handleStaticDataChange = useCallback(
    (value: string) => {
      setStaticData(value);
      try {
        const parsed = value ? JSON.parse(value) : undefined;
        if (dataSourceType === "static") {
          updateNode({ staticDataSource: parsed });
        } else {
          updateNode({ request: { ...request, staticData: parsed } });
        }
      } catch {}
    },
    [request, updateNode, dataSourceType],
  );

  // 添加 Key-Value 项
  const addKeyValue = useCallback((type: "headers" | "params") => {
    if (type === "headers") {
      setHeaders((prev) => [...prev, { key: "", value: "" }]);
    } else {
      setParams((prev) => [...prev, { key: "", value: "" }]);
    }
  }, []);

  // 删除 Key-Value 项
  const removeKeyValue = useCallback((type: "headers" | "params", index: number) => {
    if (type === "headers") {
      setHeaders((prev) => {
        const newHeaders = [...prev];
        newHeaders.splice(index, 1);
        return newHeaders.length ? newHeaders : [{ key: "", value: "" }];
      });
    } else {
      setParams((prev) => {
        const newParams = [...prev];
        newParams.splice(index, 1);
        return newParams.length ? newParams : [{ key: "", value: "" }];
      });
    }
  }, []);

  // 更新 Key-Value 项
  const updateKeyValue = useCallback((type: "headers" | "params", index: number, field: "key" | "value", val: string) => {
    if (type === "headers") {
      setHeaders((prev) => {
        const newHeaders = [...prev];
        newHeaders[index] = { ...newHeaders[index], [field]: val };
        return newHeaders;
      });
    } else {
      setParams((prev) => {
        const newParams = [...prev];
        newParams[index] = { ...newParams[index], [field]: val };
        return newParams;
      });
    }
  }, []);

  // 打开过滤器编辑弹窗
  const openFilterModal = useCallback(() => {
    setFilterEditingValue(dataFilter);
    setFilterModalVisible(true);
  }, [dataFilter]);

  // 保存过滤器
  const saveFilter = useCallback(() => {
    setDataFilter(filterEditingValue || "(data) => data");
    updateNode({
      request: { ...request, dataFilter: filterEditingValue || "(data) => data" },
    });
    setFilterModalVisible(false);
  }, [filterEditingValue, request, updateNode]);

  // 打开静态数据编辑弹窗
  const openStaticDataModal = useCallback(() => {
    setStaticDataEditingValue(staticData || "");
    setStaticDataModalVisible(true);
  }, [staticData]);

  // 保存静态数据
  const saveStaticData = useCallback(() => {
    try {
      const parsed = staticDataEditingValue ? JSON.parse(staticDataEditingValue) : null;
      updateNode({ staticDataSource: parsed });
      setStaticDataModalVisible(false);
      setStaticData(staticDataEditingValue);
      message.success("静态数据保存成功");
    } catch (e) {
      message.error("JSON 格式错误，请检查");
    }
  }, [staticDataEditingValue, updateNode]);

  // 手动触发请求
  const handleManualRequest = useCallback(async () => {
    const key = dataSourceType === "combined" ? pageDataSourceKey : dataSourceKey;
    if (!key) {
      message.warning("请先配置数据源");
      return;
    }
    setManualRequestLoading(true);
    try {
      if (dataSourceType === "combined") {
        await dataSourceRegistry.fetch(key);
      } else {
        // 单组件 API 请求 - 通过 engine 执行
        const instance = engine?.instance?.get?.(componentNode?.id);
        if (instance?.request) {
          await instance.request();
        }
      }
      message.success("请求成功");
    } catch (e) {
      message.error("请求失败");
    } finally {
      setManualRequestLoading(false);
    }
  }, [dataSourceType, pageDataSourceKey, dataSourceKey, componentNode?.id, engine]);

  // 导出 JSON 文件
  const exportJson = useCallback((data: any, filename: string) => {
    if (!data) {
      message.warning("无数据可导出");
      return;
    }
    const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (data: any) => {
    if (!data) {
      message.warning("无数据可复制");
      return;
    }
    try {
      const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      message.success("已复制到剪贴板");
    } catch (e) {
      // 降级方案：创建临时 input
      const textarea = document.createElement("textarea");
      textarea.value = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      message.success("已复制到剪贴板");
    }
  }, []);

  // 原始响应数据 - 优先使用 request.rawData，其次使用 currentData?.data
  const rawData = useMemo(() => {
    // 如果有手动保存的原始数据，优先使用
    const req = componentNode?.request as any;
    if (req?.rawData !== undefined) {
      return req.rawData;
    }
    // 否则使用 API 返回的数据
    return currentData?.data;
  }, [(componentNode?.request as any)?.rawData, currentData?.data]);

  // 应用数据过滤器后的数据
  const filteredData = useMemo(() => {
    if (!rawData) return null;
    try {
      const filterFn = eval(dataFilter);
      if (typeof filterFn === "function") {
        return filterFn(rawData);
      }
      return rawData;
    } catch (e) {
      console.error("Data filter error:", e);
      return rawData;
    }
  }, [rawData, dataFilter]);

  // Tab 配置
  const tabItems = [
    {
      key: "template",
      label: "组件数据模板",
      children: (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <div className={styles.tabActions}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(componentTemplate)}
              >
                复制
              </Button>
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => exportJson(componentTemplate, `template_${componentNode?.cId || "data"}`)}
              >
                导出
              </Button>
              <Tooltip title="组件所需数据格式，仅供参照" placement="top">
                <span className={styles.tabDescIcon}>?</span>
              </Tooltip>
            </div>
          </div>
          {componentTemplate ? (
            <div className={styles.gridPreview}>
              <pre className={styles.jsonPreview}>
                {JSON.stringify(componentTemplate, null, 2)}
              </pre>
            </div>
          ) : (
            <div className={styles.noData}>该组件未定义数据模板</div>
          )}
        </div>
      ),
    },
    {
      key: "raw",
      label: "原始数据",
      children: (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <div className={styles.tabActions}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(rawData)}
              >
                复制
              </Button>
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => exportJson(rawData, `raw_${componentNode?.cId || "data"}`)}
              >
                导出
              </Button>
              <Tooltip
                title={
                  dataSourceType === "static"
                    ? "静态数据"
                    : dataSourceType === "request"
                    ? "API 接口返回的原始数据"
                    : "页面级数据源返回的原始数据"
                }
                placement="top"
              >
                <span className={styles.tabDescIcon}>?</span>
              </Tooltip>
            </div>
          </div>
          {currentData?.loading ? (
            <div className={styles.loading}>加载中...</div>
          ) : currentData?.error ? (
            <div className={styles.error}>Error: {currentData.error.message}</div>
          ) : rawData ? (
            <div className={styles.gridPreview}>
              <pre className={styles.jsonPreview}>
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          ) : (
            <div className={styles.noData}>暂无原始数据</div>
          )}
        </div>
      ),
    },
    {
      key: "processed",
      label: "处理后数据",
      children: (
        <div className={styles.tabContent}>
          <div className={styles.tabHeader}>
            <div className={styles.tabActions}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(filteredData)}
              >
                复制
              </Button>
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => exportJson(filteredData, `processed_${componentNode?.cId || "data"}`)}
              >
                导出
              </Button>
              <Tooltip title="原始数据经过过滤函数处理后的数据" placement="top">
                <span className={styles.tabDescIcon}>?</span>
              </Tooltip>
            </div>
          </div>
          {filteredData ? (
            <div className={styles.gridPreview}>
              <pre className={styles.jsonPreview}>
                {JSON.stringify(filteredData, null, 2)}
              </pre>
            </div>
          ) : (
            <div className={styles.noData}>暂无处理后数据</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={props?.style} className={styles.container}>
      {/* 静态数据模式 */}
      {dataSourceType === "static" && (
        <div className={styles.staticSection}>
          <div className={styles.sectionTitle}>
            <span>静态数据配置</span>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={openStaticDataModal}
            >
              弹窗编辑
            </Button>
          </div>
          <CodeEditor
            value={staticData}
            onChange={handleStaticDataChange}
            language="json"
            minimap={false}
            style={{ height: 200 }}
          />
          <div className={styles.tip}>输入 JSON 格式的静态数据</div>
        </div>
      )}

      {/* 单组件 API 模式 */}
      {dataSourceType === "request" && (
        <div className={styles.apiSection}>
          <div className={styles.sectionTitle}>基本配置</div>

          <div className={styles.row}>
            <span className={styles.label}>请求地址</span>
            <IInput
              className={styles.flex2}
              value={request.url}
              placeholder="https://api.example.com/data"
              onChange={(url) => updateNode({ request: { ...request, url } })}
            />
          </div>

          <div className={styles.row}>
            <span className={styles.label}>请求方法</span>
            <Select
              value={request.method || "get"}
              onChange={(value) => updateNode({ request: { ...request, method: value } })}
              size="small"
              style={{ width: 120 }}
            >
              <Select.Option value="get">GET</Select.Option>
              <Select.Option value="post">POST</Select.Option>
              <Select.Option value="postJSON">POST JSON</Select.Option>
              <Select.Option value="jsonp">JSONP</Select.Option>
            </Select>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>轮询</span>
            <Switch
              size="small"
              checked={request.loop}
              onChange={(checked) => updateNode({ request: { ...request, loop: checked } })}
            />
            {request.loop && (
              <>
                <span className={styles.label}>间隔</span>
                <input
                  type="number"
                  className={styles.numberInput}
                  min={1000}
                  step={1000}
                  value={request.loopDelay || 3000}
                  onChange={(e: any) =>
                    updateNode({ request: { ...request, loopDelay: parseInt(e.target.value) || 3000 } })
                  }
                />
                <span className={styles.unit}>毫秒</span>
              </>
            )}
          </div>

          {/* 高级配置折叠 */}
          <Collapse ghost className={styles.collapse}>
            <Panel header="高级配置" key="advance">
              {/* 请求头 */}
              <div className={styles.kvSection}>
                <div className={styles.kvHeader}>
                  <span>请求头</span>
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addKeyValue("headers")}>
                    添加
                  </Button>
                </div>
                {headers.map((item, index) => (
                  <div key={`h-${index}`} className={styles.kvRow}>
                    <IInput
                      placeholder="Key"
                      value={item.key}
                      onChange={(val) => updateKeyValue("headers", index, "key", val)}
                    />
                    <IInput
                      placeholder="Value"
                      value={item.value}
                      onChange={(val) => updateKeyValue("headers", index, "value", val)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeKeyValue("headers", index)}
                    />
                  </div>
                ))}
              </div>

              {/* 请求参数 */}
              <div className={styles.kvSection}>
                <div className={styles.kvHeader}>
                  <span>请求参数</span>
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addKeyValue("params")}>
                    添加
                  </Button>
                </div>
                {params.map((item, index) => (
                  <div key={`p-${index}`} className={styles.kvRow}>
                    <IInput
                      placeholder="Key"
                      value={item.key}
                      onChange={(val) => updateKeyValue("params", index, "key", val)}
                    />
                    <IInput
                      placeholder="Value"
                      value={item.value}
                      onChange={(val) => updateKeyValue("params", index, "value", val)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeKeyValue("params", index)}
                    />
                  </div>
                ))}
              </div>

              {/* 数据过滤 */}
              <div className={styles.filterSection}>
                <div className={styles.filterHeader}>
                  <span>数据过滤</span>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={openFilterModal}>
                    弹窗编辑
                  </Button>
                </div>
                <div className={styles.filterPreview}>
                  <code>{dataFilter}</code>
                </div>
              </div>
            </Panel>
          </Collapse>
        </div>
      )}

      {/* 组合模式 - 引用页面级数据源 */}
      {dataSourceType === "combined" && (
        <div className={styles.combinedSection}>
          <div className={styles.sectionTitle}>组合模式</div>
          <div className={styles.sectionTip}>引用页面级数据源，多个组件共享同一请求</div>

          <div className={styles.row}>
            <span className={styles.label}>页面数据源</span>
            <Select
              className={styles.flex1}
              value={pageDataSourceKey}
              onChange={(value) => updateNode({ pageDataSourceKey: value })}
              placeholder="选择页面级数据源"
            >
              {pageDataSources.map((ds) => (
                <Select.Option key={ds.key} value={ds.key}>
                  {ds.key} - {ds.url}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              loading={manualRequestLoading}
              onClick={handleManualRequest}
            >
              手动请求
            </Button>
          </div>

          {pageDataSourceKey && (
            <>
              <div className={styles.filterSection}>
                <div className={styles.filterHeader}>
                  <span>数据过滤</span>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={openFilterModal}>
                    弹窗编辑
                  </Button>
                </div>
                <div className={styles.filterPreview}>
                  <code>{dataFilter}</code>
                </div>
              </div>
            </>
          )}

          {!pageDataSourceKey && pageDataSources.length === 0 && (
            <div className={styles.noData}>请先在页面属性中配置页面级数据源</div>
          )}

          {pageDataSourceKey && (
            <div className={styles.pageDsInfo}>
              {(() => {
                const ds = pageDataSources.find((d) => d.key === pageDataSourceKey);
                if (!ds) return null;
                return (
                  <div className={styles.dsDetail}>
                    <span className={styles.dsMethod}>{ds.method?.toUpperCase()}</span>
                    <span className={styles.dsUrl}>{ds.url}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 数据预览 Tabs - 非静态数据模式显示 */}
      {dataSourceType !== "static" && (
        <div className={styles.previewSection}>
          <div className={styles.manualRequestBar}>
            <Button
              type="default"
              size="small"
              icon={<PlayCircleOutlined />}
              loading={manualRequestLoading}
              onClick={handleManualRequest}
            >
              发起请求
            </Button>
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            items={tabItems}
            size="small"
          />
        </div>
      )}

      {/* 静态数据编辑弹窗 */}
      <Modal
        title="编辑静态数据"
        open={staticDataModalVisible}
        onOk={saveStaticData}
        onCancel={() => setStaticDataModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <div className={styles.rawDataModalContent}>
          <p className={styles.filterTip}>
            编辑静态 JSON 数据，保存后将更新组件的静态数据配置。
          </p>
          <CodeEditor
            value={staticDataEditingValue}
            onChange={(val) => setStaticDataEditingValue(val || "")}
            language="json"
            minimap={false}
            style={{ height: 300 }}
          />
        </div>
      </Modal>

      {/* 过滤器编辑弹窗 */}
      <Modal
        title="数据过滤函数编辑"
        open={filterModalVisible}
        onOk={saveFilter}
        onCancel={() => setFilterModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <div className={styles.filterModalContent}>
          <p className={styles.filterTip}>
            输入一个 JavaScript 函数，接收接口返回的原始数据，返回组件需要的数据结构。
          </p>
          <CodeEditor
            value={filterEditingValue}
            onChange={(val) => setFilterEditingValue(val || "(data) => data")}
            language="javascript"
            minimap={false}
            style={{ height: 200 }}
          />
          <div className={styles.filterExamples}>
            <p>常用示例:</p>
            <ul>
              <li>
                <code onClick={() => setFilterEditingValue("(data) => data.list")}>(data) =&gt; data.list</code>
                - 提取 list 字段
              </li>
              <li>
                <code onClick={() => setFilterEditingValue("(data) => data.result.items")}>(data) =&gt; data.result.items</code>
                - 提取嵌套字段
              </li>
              <li>
                <code onClick={() => setFilterEditingValue("(data) => data.filter(item => item.status === 1)")}>
                  (data) =&gt; data.filter(item =&gt; item.status === 1)
                </code>
                - 过滤数据
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
