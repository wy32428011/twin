/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:15
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-25 20:57:47
 * @FilePath: \react-big-screen-master\src\packages\shortCutKeys\behaviors\saveLocal.ts
 * @Description: 保存到本地和后端
 */
/**
 * 保存到本地
 * @param silent 是否静默（默认false。true无消息提示，false有消息提示）
 */
import { message } from "antd";
import { RbsEngine } from "@/export";
import { pageBackendSync } from "@/services/pageBackendSync";
import { isLocalDebug } from "@/services/config";

/**
 * 保存本地
 * @param silent 是否静默（默认false。true无消息提示，false有消息提示）
 */
export function saveLocal(silent?: boolean) {
  const engine = RbsEngine.getActiveEngine();
  if (!engine) return;

  engine.page.setComponentNodes(engine.config.getCurrentPage(), engine.componentNode.getAll());

  if (!silent) {
    message.success("保存成功");
  }
}

/**
 * 保存到后端
 * @param silent 是否静默（默认false。true无消息提示，false有消息提示）
 */
export async function saveToBackend(silent?: boolean): Promise<boolean> {
  const engine = RbsEngine.getActiveEngine();
  if (!engine) return false;

  const currentPageId = engine.config.getCurrentPage();
  if (!currentPageId) {
    if (!silent) {
      message.warning("当前没有选中的页面");
    }
    return false;
  }

  const components = engine.componentNode.getAll();

  try {
    if (isLocalDebug()) {
      // 本地调试模式，只保存到本地
      engine.page.setComponentNodes(currentPageId, components);
      if (!silent) {
        message.success("保存成功（本地模式）");
      }
      return true;
    } else {
      // 请求后端
      const success = await pageBackendSync.saveScreenComponentsToBackend(currentPageId, components);
      if (success) {
        if (!silent) {
          message.success("保存成功");
        }
      } else {
        if (!silent) {
          message.error("保存失败，请重试");
        }
      }
      return success;
    }
  } catch (error) {
    console.error("[saveToBackend] Error:", error);
    if (!silent) {
      message.error("保存失败: " + (error as Error).message);
    }
    return false;
  }
}
