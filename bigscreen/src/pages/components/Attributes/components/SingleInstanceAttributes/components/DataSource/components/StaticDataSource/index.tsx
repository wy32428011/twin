/**
 * 静态数据源
 */
import React, { useEffect, useState } from "react";
import styles from "./index.module.less";
import CodeEditor from "@/components/CodeEditor";
import { Line } from "@/components/Attributes";
import { message, Tooltip, Button, Space } from "antd";
import { SaveOutlined, FormatOutlined, ClearOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useSingleSelectedInstance } from "@/pages/components/Attributes/components/SingleInstanceAttributes";
import { addHistory } from "@/packages/shortCutKeys";
import { useEngineContext } from "@/export/context";

interface Props {
  style?: React.CSSProperties;
}

export default function StaticDataSource(props: Props) {
  const { engine } = useEngineContext();
  const { componentNode } = useSingleSelectedInstance();
  const [code, setCode] = useState<string>("");
  const [isValidJson, setIsValidJson] = useState<boolean | null>(null);

  function handleFormat() {
    try {
      const json = JSON.parse(code);
      setCode(JSON.stringify(json, null, 2));
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
      message.warn("JSON 格式错误");
    }
  }

  function handleClear() {
    setCode("");
    setIsValidJson(null);
  }

  function handleSave() {
    if (!code.trim()) {
      return message.warn("数据不能为空");
    }
    try {
      const json = JSON.parse(code);
      engine.componentNode.update(componentNode?.id, {
        staticDataSource: json,
      });
      message.success("保存成功");
      addHistory("修改静态数据");
    } catch (e) {
      message.warn("JSON 格式不正确");
    }
  }

  function handleChange(value: string) {
    setCode(value);
    if (!value.trim()) {
      setIsValidJson(null);
      return;
    }
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  }

  useEffect(() => {
    setCode(
      componentNode?.staticDataSource
        ? JSON.stringify(componentNode?.staticDataSource || {}, null, 2)
        : "",
    );
    if (componentNode?.staticDataSource) {
      setIsValidJson(true);
    }
  }, [componentNode]);

  return (
    <div className={styles.staticDataSource} style={props?.style}>
      <Line label={"静态数据"}>
        <Space size={4}>
          {isValidJson === true && (
            <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 14 }} />
          )}
          {isValidJson === false && (
            <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 14 }} />
          )}
          <Tooltip title={"格式化"}>
            <Button type="text" size="small" icon={<FormatOutlined />} onClick={handleFormat} />
          </Tooltip>
          <Tooltip title={"清空"}>
            <Button type="text" size="small" icon={<ClearOutlined />} onClick={handleClear} />
          </Tooltip>
          <Tooltip title={"保存"}>
            <Button type="text" size="small" icon={<SaveOutlined />} onClick={handleSave} />
          </Tooltip>
        </Space>
      </Line>
      <div className={styles.editorWrapper}>
        <CodeEditor
          minimap={false}
          language={"json"}
          style={{ flex: 1 }}
          value={code}
          onChange={handleChange}
          options={{
            tabSize: 2,
            fontSize: 12,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}