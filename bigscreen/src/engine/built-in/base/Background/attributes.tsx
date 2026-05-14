/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:13
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-25 20:36:52
 * @FilePath: \react-big-screen-master\src\engine\built-in\base\Background\attributes.tsx
 * @Description: 背景卡片
 */
/**
 * 属性配置页面
 */
import { createAttributesByConfig } from "@/engine";

export const DEFAULT_OPTIONS = {
  background: "rgba(128, 128, 128, 0.3)",
  borderRadius: 20
};

export interface BackgroundOptions {
  background: string; // 背景颜色
  borderRadius: number // 圆角
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
  ],
  DEFAULT_OPTIONS,
);
