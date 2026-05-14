/**
 * useDataSource
 * @description 组件消费数据源的 hook
 */
import { useCallback, useEffect, useMemo } from "react";
import { useDataSourceStore, dataSourceRegistry } from "./index";
import type { DataItem } from "./types";

interface UseDataSourceResult {
  data: any;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<any>;
}

/**
 * 使用单个数据源
 * @param key 数据源 key
 * @param options 配置选项
 */
export function useDataSource(
  key: string,
  options?: {
    /** 是否在挂载时自动请求（默认 true） */
    autoFetch?: boolean;
    /** 额外参数 */
    params?: Record<string, any>;
  },
): UseDataSourceResult {
  const { autoFetch = true, params } = options || {};

  const dataMap = useDataSourceStore((state) => state.dataMap);
  const subscribe = useDataSourceStore((state) => state.subscribe);
  const unsubscribe = useDataSourceStore((state) => state.unsubscribe);

  const dataItem = dataMap[key] as DataItem | undefined;

  // 订阅数据源（组件级别，不需要 componentId）
  useEffect(() => {
    if (!key) return;

    // 订阅（使用 key 作为标识，实际订阅者是组件自己）
    subscribe(key, [key]);

    return () => {
      unsubscribe(key);
    };
  }, [key]);

  // 自动请求
  useEffect(() => {
    if (!autoFetch || !key) return;
    dataSourceRegistry.fetch(key, params);
  }, [key, autoFetch, params]);

  // reload 函数
  const reload = useCallback(() => {
    return dataSourceRegistry.refresh(key);
  }, [key]);

  return {
    data: dataItem?.data,
    loading: dataItem?.loading ?? false,
    error: dataItem?.error ?? null,
    reload,
  };
}

/**
 * 使用多个数据源
 * @param keys 数据源 keys
 * @param options 配置选项
 */
export function useDataSourceMany(
  keys: string[],
  options?: {
    autoFetch?: boolean;
    params?: Record<string, any>;
  },
): Record<string, UseDataSourceResult> {
  const { autoFetch = true, params } = options || {};

  const dataMap = useDataSourceStore((state) => state.dataMap);
  const subscribe = useDataSourceStore((state) => state.subscribe);
  const unsubscribe = useDataSourceStore((state) => state.unsubscribe);

  // 订阅所有数据源
  useEffect(() => {
    if (!keys.length) return;

    // 批量订阅
    keys.forEach((key) => {
      subscribe(key, [key]);
    });

    return () => {
      keys.forEach((key) => {
        unsubscribe(key);
      });
    };
  }, [keys.join(",")]);

  // 自动请求
  useEffect(() => {
    if (!autoFetch || !keys.length) return;
    dataSourceRegistry.fetchMany(keys, params);
  }, [keys.join(","), autoFetch, params]);

  // 构建结果
  const result = useMemo(() => {
    const ret: Record<string, UseDataSourceResult> = {};
    keys.forEach((key) => {
      const dataItem = dataMap[key] as DataItem | undefined;
      ret[key] = {
        data: dataItem?.data,
        loading: dataItem?.loading ?? false,
        error: dataItem?.error ?? null,
        reload: () => dataSourceRegistry.refresh(key),
      };
    });
    return ret;
  }, [keys.join(","), dataMap]);

  return result;
}