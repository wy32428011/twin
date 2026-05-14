/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:14
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-27 16:56:50
 * @FilePath: \react-big-screen-master\src\engine\built-in\base\Text\attributes.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 属性配置页面
 */
import { createAttributesByConfig } from "@/engine";
// import React from "react";
// import { TextAlignType } from "@/components/Attributes";

export const DEFAULT_OPTIONS: TextOptions = {
  color: "#fff",
  value: "一段文字",
  fontSize: 16,
  // lineHeight: 32,
};

export interface TextOptions {
  value?: string; // 文字内容
  fontWeight?: string; // 字重
  color?: string; // 字体颜色
  // fontStyle?: React.CSSProperties["fontStyle"]; // 字体样式
  // lineHeight?: number; // 行高（px）
  fontSize?: number; // 字号
  // textAlign?: TextAlignType; // 水平对齐（默认不设置）
  // background?: string; // 背景颜色
}

export default createAttributesByConfig<TextOptions>(
  [
    { key: "value", label: "内容", component: "textarea" },
    { key: "fontSize", label: "字号", component: "inputNumber", options: { min: 8 } },
    // {
    //   key: "lineHeight",
    //   label: "行高",
    //   labelTip: "单位px",
    //   component: "inputNumber",
    //   options: { min: 8 },
    // },
    { key: "fontWeight", label: "字重", component: "fontWeightSelect" },
    {
      key: "color",
      label: "颜色",
      component: "colorPicker",
      options: {
        reset: true,
      },
    },
    // { key: "background", label: "背景", component: "colorPicker" },
    // {
    //   key: "fontStyle",
    //   label: "斜体",
    //   component: "checkboxValue",
    //   options: {
    //     value: "italic",
    //   },
    // },
    // { key: "textAlign", label: "水平对齐", component: "textAlignSelect" },
  ],
  DEFAULT_OPTIONS,
);
