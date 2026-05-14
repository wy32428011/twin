/**
 * 选择页面
 */
import { RbsEngine } from "@/export";

export function selectPage(pageId?: string) {
  const engine = RbsEngine.getActiveEngine();
  if (!engine) return;

  if (pageId) {
    // 设置当前页面ID，usePageSync 的 useEffect 会自动加载组件数据
    engine.config.setConfig({ currentPageId: pageId });
    engine.page.saveCurrentPageId(pageId);
  } else {
    // 清除当前页面
    engine.config.setConfig({ currentPageId: undefined });
    engine.page.saveCurrentPageId(null);
  }
}