/**
 * DataSourceStore - Zustand Store
 * @description 统一管理数据源状态、缓存、依赖追踪
 */
import { create } from "zustand";
import type { DataSourceState, DataItem, QueryParams } from "./types";

interface DataSourceActions {
  // 设置数据
  setData: (key: string, item: Partial<DataItem>) => void;
  // 设置查询参数
  setQueryParams: (params: Partial<QueryParams>) => void;
  // 清除查询参数
  clearQueryParams: () => void;
  // 组件订阅
  subscribe: (componentId: string, keys: string[]) => void;
  // 组件取消订阅
  unsubscribe: (componentId: string) => void;
  // 获取数据
  getData: (key: string) => DataItem | undefined;
  // 获取组件订阅的所有数据
  getDataByComponent: (componentId: string) => Record<string, DataItem>;
  // 批量获取数据
  getDataMany: (keys: string[]) => Record<string, DataItem>;
  // 获取已订阅的 keys
  getSubscribedKeys: (componentId: string) => string[];
  // 重置状态
  reset: () => void;
}

const INIT_STATE: DataSourceState = {
  dataMap: {},
  queryParams: {},
  subscriptions: {},
};

export const useDataSourceStore = create<DataSourceState & DataSourceActions>((set, get) => ({
  ...INIT_STATE,

  // 设置数据
  setData: (key, item) => {
    set((state) => ({
      dataMap: {
        ...state.dataMap,
        [key]: {
          ...state.dataMap[key],
          ...item,
        },
      },
    }));
  },

  // 设置查询参数
  setQueryParams: (params) => {
    set((state) => {
      const newQueryParams = { ...state.queryParams };
      Object.entries(params).forEach(([key, value]) => {
        newQueryParams[key] = value ?? {};
      });
      return { queryParams: newQueryParams };
    });
  },

  // 清除查询参数
  clearQueryParams: () => {
    set({ queryParams: {} });
  },

  // 组件订阅
  subscribe: (componentId, keys) => {
    set((state) => {
      const newSubscriptions = { ...state.subscriptions };
      keys.forEach((key) => {
        if (!newSubscriptions[key]) {
          newSubscriptions[key] = new Set();
        }
        newSubscriptions[key].add(componentId);
      });
      return { subscriptions: newSubscriptions };
    });
  },

  // 组件取消订阅
  unsubscribe: (componentId) => {
    set((state) => {
      const newSubscriptions = { ...state.subscriptions };
      Object.keys(newSubscriptions).forEach((key) => {
        newSubscriptions[key].delete(componentId);
        if (newSubscriptions[key].size === 0) {
          delete newSubscriptions[key];
        }
      });
      return { subscriptions: newSubscriptions };
    });
  },

  // 获取数据
  getData: (key) => {
    return get().dataMap[key];
  },

  // 获取组件订阅的所有数据
  getDataByComponent: (componentId) => {
    const { dataMap, subscriptions } = get();
    const result: Record<string, DataItem> = {};
    Object.entries(subscriptions).forEach(([key, componentIds]) => {
      if (componentIds.has(componentId) && dataMap[key]) {
        result[key] = dataMap[key];
      }
    });
    return result;
  },

  // 批量获取数据
  getDataMany: (keys) => {
    const { dataMap } = get();
    const result: Record<string, DataItem> = {};
    keys.forEach((key) => {
      if (dataMap[key]) {
        result[key] = dataMap[key];
      }
    });
    return result;
  },

  // 获取已订阅的 keys
  getSubscribedKeys: (componentId) => {
    const { subscriptions } = get();
    const keys: string[] = [];
    Object.entries(subscriptions).forEach(([key, componentIds]) => {
      if (componentIds.has(componentId)) {
        keys.push(key);
      }
    });
    return keys;
  },

  // 重置状态
  reset: () => {
    set(INIT_STATE);
  },
}));

// 辅助函数：获取当前状态（用于非 React 上下文）
export const getDataSourceState = () => useDataSourceStore.getState();