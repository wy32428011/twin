/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:14
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-26 16:28:33
 * @FilePath: \react-big-screen-master\src\engine\built-in\base\Input\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 输入框
 */
import { createComponent, EventData } from "@/engine";
import { Input } from "antd";
import { DEFAULT_OPTIONS, InputOptions } from "./attributes";
import { useState } from "react";
import { useUpdateEffect } from "ahooks";
import { useDataSourceStore } from "@/packages/dataSource";
import { iframeBridge } from "@/packages/iframeBridge";

import styles from "./index.module.less";

type TriggerKeys = "input";
export const inputTriggers: EventData<TriggerKeys>[] = [{ label: "输入文本", value: "input" }];
type ExposeKeys = "changeValue";
export const inputExposes: EventData<ExposeKeys>[] = [{ label: "修改值", value: "changeValue" }];

export default createComponent<InputOptions, TriggerKeys, ExposeKeys>((props) => {
  const { width, height, options, handleTrigger, useExpose } = props;
  const [value, setValue] = useState<string | undefined>(options?.value);
  const setQueryParams = useDataSourceStore((state) => state.setQueryParams);

  // 监听options值
  useUpdateEffect(() => {
    setValue(options?.value);
  }, [options?.value]);

  // 暴露事件
  useExpose({
    changeValue: (payload) => {
      setValue(payload);
    },
  });

  // 输入变化时更新全局查询参数
  const handleInputChange = (e: any) => {
    const str = e.target.value;
    setValue(str);
    handleTrigger("input", str);

    // 如果配置了 dataSourceKey，更新对应的查询参数
    if (options?.dataSourceKey) {
      const queryParamKey = options?.queryParamKey || "q";
      setQueryParams({
        [options.dataSourceKey]: {
          [queryParamKey]: str,
        },
      });
    }

    // 如果开启了设备ID模式，向父窗口发送设备ID
    if (options?.deviceIdMode) {
      iframeBridge.notifyDeviceChange(
        str,
        undefined,
        { deviceIdKey: options?.deviceIdKey || "deviceId" }
      );
    }
  };

  return (
    <div className={styles.inputContainer}>
      <Input
        style={{
          width: width,
          height: height,
          backgroundColor: options?.background,
          borderRadius: options?.borderRadius,
          fontSize: options?.fontSize,
        }}
        value={value}
        maxLength={options?.maxLength}
        allowClear={options?.allowClear}
        placeholder={options?.placeholder}
        className={styles.customInput}
        onChange={handleInputChange}
      />
    </div>
  );
}, DEFAULT_OPTIONS);
