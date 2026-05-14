/**
 * usePageSync
 * @description 页面切换时自动从后端加载组件数据，修改后自动保存到后端
 */
import { useEffect, useCallback, useRef } from "react";
import { pageBackendSync } from "@/services/pageBackendSync";
import { Engine } from "@/engine";
import { message } from "antd";

export function usePageSync(engine: Engine) {
  const syncRef = useRef(pageBackendSync);

  // 启用同步
  useEffect(() => {
    syncRef.current.enableSync();
    return () => {
      syncRef.current.disableSync();
    };
  }, []);

  // 加载大屏组件数据
  const loadScreenData = useCallback(async (screenId: string) => {
    try {
      // 从后端加载大屏组件
      const components = await syncRef.current.loadScreenComponentsFromBackend(screenId);

      // 设置当前页面组件
      engine.componentNode.set(components);

      // 保存当前页面ID
      engine.page.saveCurrentPageId(screenId);

      return components;
    } catch (error) {
      console.error("[usePageSync] Failed to load screen data:", error);
      message.error("加载大屏数据失败");
      return null;
    }
  }, [engine]);

  // 保存大屏数据
  const saveScreenData = useCallback(async (screenId: string, components?: any[]) => {
    try {
      const componentsToSave = components || engine.componentNode.getAll();
      const success = await syncRef.current.saveScreenComponentsToBackend(screenId, componentsToSave);

      if (success) {
        console.log("[usePageSync] Screen data saved successfully:", screenId);
      } else {
        console.warn("[usePageSync] Failed to save screen data:", screenId);
      }

      return success;
    } catch (error) {
      console.error("[usePageSync] Failed to save screen data:", error);
      return false;
    }
  }, [engine]);

  // 切换大屏时加载新大屏数据
  const handleScreenChange = useCallback(async (newScreenId: string, oldScreenId?: string) => {
    // 先保存旧大屏数据
    if (oldScreenId) {
      await saveScreenData(oldScreenId);
    }

    // 加载新大屏数据
    await loadScreenData(newScreenId);
  }, [loadScreenData, saveScreenData]);

  // 监听页面切换事件，加载对应的大屏组件
  useEffect(() => {
    const config = engine.config.getConfig();
    const currentPageId = config.currentPageId;

    if (currentPageId) {
      loadScreenData(currentPageId);
    }
  }, [engine, loadScreenData]);

  return {
    loadScreenData,
    saveScreenData,
    handleScreenChange,
    syncInstance: syncRef.current,
  };
}