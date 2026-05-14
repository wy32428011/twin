/**
 * BarChart属性面板
 */

import { createAttributesByConfig } from "@/engine";

export interface BarChartData {
  categories: string[];
  series: {
    name?: string;
    type?: string;
    data: (number | { value: number; itemStyle?: { color?: string } })[];
  }[];
}

export const DEFAULT_OPTIONS: BarChartOptions = {
  background: "rgba(0, 0, 0, 0.16)",
  backgroundRadius: 20, // 背景圆角
  barWidth: 20, // 柱体宽度
  barGap: 30, // 柱形间距(%)
  barCategoryGap: 20, // 类目间距(%)
  barColor: "rgba(255, 214, 0, 1)", // 柱体颜色
  xAxisShow: true,
  yAxisShow: true,
};

export interface BarChartOptions {
  background?: string; // 背景颜色
  backgroundRadius?: number; // 背景圆角(px)
  barColor?: string; // 柱体颜色
  barWidth?: number; // 柱体宽度
  barGap?: number; // 柱形间距(%)
  barCategoryGap?: number; // 类目间距(%)
  xAxisShow?: boolean; // 是否显示x轴
  yAxisShow?: boolean; // 是否显示y轴
}

export default createAttributesByConfig<BarChartOptions>(
  [
    {
      key: "background",
      label: "背景",
      component: "colorPicker",
      options: { reset: true },
    },
    {
      key: "backgroundRadius",
      label: "背景圆角",
      labelTip: "背景圆角(px)",
      component: "inputNumber",
      options: { min: 0, max: 100, step: 1 },
    },
    {
      key: "barColor",
      label: "柱体颜色",
      component: "colorPicker",
      options: { reset: true },
    },
    {
      key: "barWidth",
      label: "柱体宽度",
      labelTip: "柱体宽度(px)",
      component: "inputNumber",
      options: { min: 1, max: 100, step: 1 },
    },
    {
      key: "barGap",
      label: "柱形间距",
      labelTip: "柱形之间的间距(%)",
      component: "inputNumber",
      options: { min: 0, max: 100, step: 5 },
    },
    {
      key: "barCategoryGap",
      label: "类目间距",
      labelTip: "不同类目之间的间距(%)",
      component: "inputNumber",
      options: { min: 0, max: 100, step: 5 },
    },
    {
      key: "xAxisShow",
      label: "显示X轴",
      component: "checkbox",
    },
    {
      key: "yAxisShow",
      label: "显示Y轴",
      component: "checkbox",
    },
  ],
  DEFAULT_OPTIONS,
);