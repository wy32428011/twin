/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:14
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-26 10:23:18
 * @FilePath: \react-big-screen-master\src\engine\built-in\base\Input\attributes.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 属性配置页面
 */
import { createAttributesByConfig } from "@/engine";

export const DEFAULT_OPTIONS: InputOptions = {
  placeholder: "请输入",
  allowClear: true,
  borderRadius: 12,
  fontSize: 18,
  background: "rgba(128, 128, 128, 0.3)",
  queryParamKey: "q", // 默认查询参数 key 为 "q"
  deviceIdMode: false, // 是否为设备ID模式
};

export interface InputOptions {
  value?: string; // 文字内容
  placeholder?: string; // 占位符
  maxLength?: number; // 最大可输入长度
  allowClear?: boolean; // 是否可清空
  borderRadius: number; // 圆角
  fontSize: number;
  background: string;
  dataSourceKey?: string; // 数据源 key（用于触发查询）
  queryParamKey?: string; // 查询参数 key（默认 "q"）
  deviceIdMode?: boolean; // 是否为设备ID模式（开启后向父窗口发送设备ID）
  deviceIdKey?: string; // 设备ID参数名（默认 "deviceId"）
}

export default createAttributesByConfig<InputOptions>(
  [
    { key: "value", label: "内容", component: "input" },
    { key: "placeholder", label: "占位符", component: "input" },
    { key: "maxLength", label: "最大长度", component: "inputNumber" },
    { key: "fontSize", label: "字体大小", component: "inputNumber" },
    {
      key: "borderRadius",
      label: "边框圆角",
      component: "inputNumber",
    },
    { key: "allowClear", label: "可清空", component: "checkbox" },
    {
      key: "background",
      label: "背景",
      component: "colorPicker",
    },
    { key: "dataSourceKey", label: "数据源Key", component: "input" },
    { key: "queryParamKey", label: "参数Key", component: "input" },
    { key: "deviceIdMode", label: "设备ID模式", component: "checkbox" },
    { key: "deviceIdKey", label: "设备ID参数", component: "input" },
  ],
  DEFAULT_OPTIONS,
);
