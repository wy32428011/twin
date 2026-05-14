/**
 * 页面属性配置页
 */
import styles from "./index.module.less";
import { JsonTypePage, PageDataSource, useCurrentPage } from "@/engine";
import { IInput } from "@/components/Attributes";
import { Button, Checkbox, Col, Row, Select, Modal, message } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useEngineContext } from "@/export/context";
import { useState, useCallback } from "react";

export default function PageAttributes() {
  const { engine } = useEngineContext();
  const [t] = useTranslation();
  const page = useCurrentPage();
  const { id, options } = page || {};
  const pageDataSources = options?.pageDataSources || [];

  // 页面级请求编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<PageDataSource>({
    key: "",
    url: "",
    method: "get",
    params: [],
    headers: [],
    loop: false,
    loopDelay: 3000,
  });

  function handleChangeOptions(extOptions: Partial<JsonTypePage["options"]>) {
    engine.page.update(id, {
      options: {
        ...options,
        ...extOptions,
      },
    });
  }

  // 打开新增弹窗
  const openAddModal = useCallback(() => {
    setEditingIndex(null);
    setEditingData({
      key: "",
      url: "",
      method: "get",
      params: [],
      headers: [],
      loop: false,
      loopDelay: 3000,
    });
    setEditModalVisible(true);
  }, []);

  // 打开编辑弹窗
  const openEditModal = useCallback((index: number) => {
    const item = pageDataSources[index];
    setEditingIndex(index);
    setEditingData({ ...item });
    setEditModalVisible(true);
  }, [pageDataSources]);

  // 保存
  const handleSave = useCallback(() => {
    if (!editingData.key || !editingData.url) {
      message.warning("请输入数据源标识和请求地址");
      return;
    }

    // 检查 key 唯一性
    const existsIndex = pageDataSources.findIndex((p, i) => p.key === editingData.key && i !== editingIndex);
    if (existsIndex !== -1) {
      message.warning("数据源标识已存在");
      return;
    }

    let newList: PageDataSource[];
    if (editingIndex !== null) {
      newList = [...pageDataSources];
      newList[editingIndex] = editingData;
    } else {
      newList = [...pageDataSources, editingData];
    }

    handleChangeOptions({ pageDataSources: newList });
    setEditModalVisible(false);
  }, [editingData, editingIndex, pageDataSources, handleChangeOptions]);

  // 删除
  const handleDelete = useCallback((index: number) => {
    const newList = pageDataSources.filter((_, i) => i !== index);
    handleChangeOptions({ pageDataSources: newList });
  }, [pageDataSources, handleChangeOptions]);

  return (
    <div className={styles.pageAttributes}>
      <div className={styles.pageAttributes_description}>
        <Row>
          <Col span={24} style={{ marginBottom: 6 }}>
            <b>{page?.name}</b>
          </Col>
          <Col span={24}>
            <span>id：{page?.id || "-"}</span>
          </Col>
          <Col span={24}>
            <span>parentId：{page?.parentId || "-"}</span>
          </Col>
        </Row>
      </div>

      {/* 页面级数据源配置 */}
      <div className={styles.pageAttributes_body}>
        <div className={styles.sectionTitle}>页面级数据源</div>
        <div className={styles.sectionTip}>配置可供多个组件共用的请求，组件选择"组合模式"后可引用</div>

        <div className={styles.dsList}>
          {pageDataSources.map((ds, index) => (
            <div key={ds.key} className={styles.dsItem}>
              <div className={styles.dsInfo}>
                <span className={styles.dsKey}>{ds.key}</span>
                <span className={styles.dsUrl}>{ds.url}</span>
                <span className={styles.dsMethod}>{ds.method?.toUpperCase()}</span>
              </div>
              <div className={styles.dsActions}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(index)} />
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(index)} />
              </div>
            </div>
          ))}
        </div>

        <Button type="dashed" block icon={<PlusOutlined />} onClick={openAddModal}>
          添加页面级数据源
        </Button>
      </div>

      {/* 编辑弹窗 */}
      <Modal
        title={editingIndex !== null ? "编辑页面级数据源" : "新增页面级数据源"}
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <div className={styles.editForm}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>数据标识</span>
            <IInput
              className={styles.formFlex1}
              value={editingData.key}
              placeholder="唯一标识，如: commonApi"
              onChange={(value) => setEditingData((prev) => ({ ...prev, key: value }))}
              disabled={editingIndex !== null}
            />
          </div>

          <div className={styles.formRow}>
            <span className={styles.formLabel}>请求地址</span>
            <IInput
              className={styles.formFlex2}
              value={editingData.url}
              placeholder="https://api.example.com/data"
              onChange={(value) => setEditingData((prev) => ({ ...prev, url: value }))}
            />
          </div>

          <div className={styles.formRow}>
            <span className={styles.formLabel}>请求方法</span>
            <Select
              value={editingData.method || "get"}
              onChange={(value) => setEditingData((prev) => ({ ...prev, method: value }))}
              style={{ width: 120 }}
            >
              <Select.Option value="get">GET</Select.Option>
              <Select.Option value="post">POST</Select.Option>
              <Select.Option value="postJSON">POST JSON</Select.Option>
              <Select.Option value="jsonp">JSONP</Select.Option>
            </Select>
          </div>

          <div className={styles.formRow}>
            <span className={styles.formLabel}>轮询</span>
            <Checkbox
              checked={editingData.loop}
              onChange={(e) => setEditingData((prev) => ({ ...prev, loop: e.target.checked }))}
            />
            {editingData.loop && (
              <>
                <span className={styles.formLabel}>间隔</span>
                <input
                  type="number"
                  className={styles.numberInput}
                  min={1000}
                  step={1000}
                  value={editingData.loopDelay || 3000}
                  onChange={(e: any) =>
                    setEditingData((prev) => ({ ...prev, loopDelay: parseInt(e.target.value) || 3000 }))
                  }
                />
                <span className={styles.formUnit}>毫秒</span>
              </>
            )}
          </div>

          {/* 请求参数 */}
          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>请求参数</div>
            {(editingData.params || []).map((param, index) => (
              <div key={`p-${index}`} className={styles.formKvRow}>
                <IInput
                  placeholder="Key"
                  value={param.key}
                  onChange={(value) => {
                    const newParams = [...(editingData.params || [])];
                    newParams[index] = { ...param, key: value };
                    setEditingData((prev) => ({ ...prev, params: newParams }));
                  }}
                />
                <IInput
                  placeholder="Value"
                  value={param.value}
                  onChange={(value) => {
                    const newParams = [...(editingData.params || [])];
                    newParams[index] = { ...param, value: value };
                    setEditingData((prev) => ({ ...prev, params: newParams }));
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newParams = (editingData.params || []).filter((_, i) => i !== index);
                    setEditingData((prev) => ({ ...prev, params: newParams }));
                  }}
                />
              </div>
            ))}
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                const newParams = [...(editingData.params || []), { key: "", value: "" }];
                setEditingData((prev) => ({ ...prev, params: newParams }));
              }}
            >
              添加参数
            </Button>
          </div>

          {/* 请求头 */}
          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>请求头</div>
            {(editingData.headers || []).map((header, index) => (
              <div key={`h-${index}`} className={styles.formKvRow}>
                <IInput
                  placeholder="Key"
                  value={header.key}
                  onChange={(value) => {
                    const newHeaders = [...(editingData.headers || [])];
                    newHeaders[index] = { ...header, key: value };
                    setEditingData((prev) => ({ ...prev, headers: newHeaders }));
                  }}
                />
                <IInput
                  placeholder="Value"
                  value={header.value}
                  onChange={(value) => {
                    const newHeaders = [...(editingData.headers || [])];
                    newHeaders[index] = { ...header, value: value };
                    setEditingData((prev) => ({ ...prev, headers: newHeaders }));
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newHeaders = (editingData.headers || []).filter((_, i) => i !== index);
                    setEditingData((prev) => ({ ...prev, headers: newHeaders }));
                  }}
                />
              </div>
            ))}
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                const newHeaders = [...(editingData.headers || []), { key: "", value: "" }];
                setEditingData((prev) => ({ ...prev, headers: newHeaders }));
              }}
            >
              添加请求头
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
