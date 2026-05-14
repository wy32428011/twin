/**
 * 反选页面组件
 */
import { addHistory } from "@/packages/shortCutKeys";
import { RbsEngine } from "@/export";

export function unSelectAllComponentNodes() {
  const engine = RbsEngine.getActiveEngine();
  if (!engine) return;
  if (engine.instance.getAllSelected().length) {
    engine.instance.unselectAll();
    addHistory("取消全选组件");
  }
}
