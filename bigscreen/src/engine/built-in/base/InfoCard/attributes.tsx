import { createAttributesByConfig } from "@/engine";

export const DEFAULT_OPTIONS = {
  background: "rgba(0, 0, 0, 0.16)",
  borderRadius: 20,
  label: "信息标签",
  labelColor: "#fff",
  valueColor: "#fff",
  labelFontSize: 14,
  valueFontSize: 24,
  align: "left",
};

export interface BackgroundOptions {
  background: string; // 背景颜色
  borderRadius: number // 圆角
  label: string;
  value?: string;
  labelColor: string;
  valueColor: string;
  labelFontSize: number;
  valueFontSize: number;
  align: string;
}

export default createAttributesByConfig<BackgroundOptions>(
  [
    {
      key: "background",
      label: "背景",
      component: "colorPicker",
    },
    {
      key: "borderRadius",
      label: "边框圆角",
      component: "inputNumber",
    },
    { key: "label", label: "标签名字", component: "input" },
    {
      key: "labelColor",
      label: "标签字体颜色",
      component: "colorPicker",
    },
    {
      key: "labelFontSize",
      label: "标签字体大小",
      component: "inputNumber",
    },
    { key: "value", label: "数据", component: "input" },
    {
      key: "valueColor",
      label: "数据字体颜色",
      component: "colorPicker",
    },
    {
      key: "valueFontSize",
      label: "数据字体大小",
      component: "inputNumber",
    },
    {
      key: "align", label: "水平对齐", component: "textAlignSelect"
    },
  ],
  DEFAULT_OPTIONS,
);
