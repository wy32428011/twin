/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:15
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-23 21:21:05
 * @FilePath: \react-big-screen-master\src\packages\shortCutKeys\behaviors\undoHistory.ts
 * @Description: 回退
 */
/**
 * 撤销到上一个历史
 */
import { RbsEngine } from "@/export";

export function undoHistory() {
  const engine = RbsEngine.getActiveEngine();
  if (!engine) return;
  const { data } = engine.history.goBack() || {};
  console.log("data", engine.history.goBack());
  if (data) {
    // 保持当前menu查看，避免撤销时影响menu切换，导致使用习惯不顺畅
    data.config.currentMenu = engine.config.getConfig().currentMenu;
    engine.loadJSON(data);
  }
}
