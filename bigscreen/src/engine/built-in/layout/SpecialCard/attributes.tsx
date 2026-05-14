/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:15
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-29 22:52:27
 * @FilePath: \react-big-screen-master\src\engine\built-in\layout\SpecialCard\attributes.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 属性配置
 */
import { createAttributesByConfig } from "@/engine";

export const DEFAULT_OPTIONS: SpecialCardOptions = {
  background: "rgba(128, 128, 128, 0.3)",
  borderRadius: 20,
};

export interface SpecialCardOptions {
  borderRadius?: number; // 边框圆角

  // 背景
  background?: string; // 背景颜色
}

export default createAttributesByConfig<SpecialCardOptions>(
  [
    { key: "borderRadius", label: "边框圆角", component: "inputNumber" },
    { key: "background", label: "背景", component: "colorPicker" },
  ],
  DEFAULT_OPTIONS,
);
