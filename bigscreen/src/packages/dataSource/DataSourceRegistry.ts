/**
 * DataSourceRegistry - 数据源注册表（单例）
 * @description 统一管理所有数据源配置和请求
 */
import type { DataSourceConfig } from "./types";
import type { PageDataSource } from "@/engine/types";
import { getDataSourceState } from "./DataSourceStore";
import request from "@/packages/request/request";

export class DataSourceRegistry {
  private static instance: DataSourceRegistry;
  private sources = new Map<string, DataSourceConfig>();
  private pageDataSources = new Map<string, PageDataSource>();
  /** 页面级数据源轮询定时器 */
  private pollingTimers = new Map<string, any>();

  private constructor() {}

  static getInstance(): DataSourceRegistry {
    if (!DataSourceRegistry.instance) {
      DataSourceRegistry.instance = new DataSourceRegistry();
    }
    return DataSourceRegistry.instance;
  }

  // ============ 组件级数据源管理 ============

  /**
   * 注册数据源
   */
  register(config: DataSourceConfig): void {
    if (!config.key) {
      console.warn("[DataSourceRegistry] config.key is required");
      return;
    }
    this.sources.set(config.key, config);
  }

  /**
   * 批量注册数据源
   */
  registerMany(configs: DataSourceConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * 获取数据源配置
   */
  get(key: string): DataSourceConfig | undefined {
    return this.sources.get(key);
  }

  /**
   * 获取所有已注册的数据源 key
   */
  getAllKeys(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * 获取所有已注册的数据源配置
   */
  getAllConfigs(): DataSourceConfig[] {
    return Array.from(this.sources.values());
  }

  /**
   * 移除数据源注册
   */
  unregister(key: string): void {
    this.sources.delete(key);
  }

  /**
   * 清除所有注册
   */
  clear(): void {
    this.sources.clear();
  }

  /**
   * 检查 key 是否已注册（组件级）
   */
  has(key: string): boolean {
    return this.sources.has(key);
  }

  // ============ 页面级数据源管理 ============

  /**
   * 注册页面级数据源
   */
  registerPageDataSource(config: PageDataSource): void {
    if (!config.key) {
      console.warn("[DataSourceRegistry] pageDataSource.key is required");
      return;
    }
    this.pageDataSources.set(config.key, config);
  }

  /**
   * 批量注册页面级数据源
   */
  registerPageDataSources(configs: PageDataSource[]): void {
    // 清除所有旧的轮询定时器
    this.pollingTimers.forEach((timer) => clearInterval(timer));
    this.pollingTimers.clear();
    // 清除所有旧的页面级数据源
    this.pageDataSources.clear();
    // 注册新的
    configs.forEach((config) => this.registerPageDataSource(config));
  }

  /**
   * 获取页面级数据源配置
   */
  getPageDataSource(key: string): PageDataSource | undefined {
    return this.pageDataSources.get(key);
  }

  /**
   * 获取所有页面级数据源 key
   */
  getAllPageDataSourceKeys(): string[] {
    return Array.from(this.pageDataSources.keys());
  }

  /**
   * 移除页面级数据源注册
   */
  unregisterPageDataSource(key: string): void {
    // 清除轮询定时器
    const timer = this.pollingTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(key);
    }
    this.pageDataSources.delete(key);
  }

  /**
   * 清除所有页面级数据源注册
   */
  clearPageDataSources(): void {
    // 清除所有轮询定时器
    this.pollingTimers.forEach((timer) => clearInterval(timer));
    this.pollingTimers.clear();
    this.pageDataSources.clear();
  }

  /**
   * 统一请求入口（同时支持组件级和页面级数据源）
   * @param key 数据源 key
   * @param extraParams 额外参数
   * @returns Promise<any>
   */
  async fetch(key: string, extraParams?: Record<string, any>): Promise<any> {
    // 优先从组件级数据源获取
    const config = this.sources.get(key);
    if (config) {
      return this.fetchFromConfig(key, config, extraParams);
    }

    // 其次从页面级数据源获取
    const pageConfig = this.pageDataSources.get(key);
    if (pageConfig) {
      return this.fetchFromPageConfig(key, pageConfig, extraParams);
    }

    console.warn(`[DataSourceRegistry] DataSource "${key}" not found`);
    return Promise.resolve(undefined);
  }

  /**
   * 批量请求（同一 key 只请求一次）
   */
  async fetchMany(keys: string[], extraParams?: Record<string, any>): Promise<Record<string, any>> {
    const uniqueKeys = [...new Set(keys)];
    const promises = uniqueKeys.map((key) => this.fetch(key, extraParams));
    const results = await Promise.allSettled(promises);

    const dataMap: Record<string, any> = {};
    results.forEach((result, index) => {
      const key = uniqueKeys[index];
      if (result.status === "fulfilled") {
        dataMap[key] = result.value;
      } else {
        console.error(`[DataSourceRegistry] fetchMany failed for key: ${key}`, result.reason);
      }
    });
    return dataMap;
  }

  /**
   * 根据 queryParams 变化自动刷新
   */
  autoRefreshByQueryChange(prevParams: Record<string, any>, newParams: Record<string, any>): void {
    const changedKeys = Object.keys(newParams).filter(
      (key) => JSON.stringify(prevParams[key]) !== JSON.stringify(newParams[key]),
    );
    changedKeys.forEach((key) => {
      if (this.sources.has(key) || this.pageDataSources.has(key)) {
        this.fetch(key);
      }
    });
  }

  /**
   * 刷新指定 key 的数据
   */
  async refresh(key: string): Promise<any> {
    const store = getDataSourceState();
    // 清除 promise 以允许新的请求
    store.setData(key, { promise: undefined });
    // 清除轮询定时器（会在 fetch 时根据配置重新设置）
    const timer = this.pollingTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(key);
    }
    return this.fetch(key);
  }

  /**
   * 刷新所有已注册的数据源
   */
  async refreshAll(): Promise<void> {
    const keys = [...this.getAllKeys(), ...this.getAllPageDataSourceKeys()];
    await this.fetchMany(keys);
  }

  // ============ 私有方法 ============

  /**
   * 从组件级配置请求
   */
  private async fetchFromConfig(key: string, config: DataSourceConfig, extraParams?: Record<string, any>): Promise<any> {
    const store = getDataSourceState();
    const currentPromise = store.dataMap[key]?.promise;

    if (currentPromise) {
      return currentPromise;
    }

    const queryParams = store.queryParams[key] || {};
    const params = {
      ...config.params,
      ...queryParams,
      ...extraParams,
    };

    store.setData(key, { loading: true, error: null });

    const promise = request(config.url, {
      method: config.method || "get",
      params: config.method === "get" ? params : undefined,
      data: config.method === "post" ? params : undefined,
      headers: config.headers,
    } as any)
      .then((data) => {
        store.setData(key, { data, loading: false, lastUpdate: Date.now(), promise: undefined });
        return data;
      })
      .catch((error) => {
        store.setData(key, { loading: false, error, promise: undefined });
        throw error;
      });

    store.setData(key, { promise });
    return promise;
  }

  /**
   * 从页面级配置请求
   */
  private async fetchFromPageConfig(key: string, config: PageDataSource, extraParams?: Record<string, any>): Promise<any> {
    const store = getDataSourceState();

    // 设置轮询定时器（仅当存在 pending promise 时才设置，避免重复请求）
    if (config.loop && !this.pollingTimers.has(key)) {
      const delay = config.loopDelay || 5000;
      this.pollingTimers.set(key, setInterval(() => {
        // 清除 promise 以允许新的请求
        store.setData(key, { promise: undefined });
        this.executePageDataSourceRequest(key, config);
      }, delay));
    }

    return this.executePageDataSourceRequest(key, config, extraParams);
  }

  /**
   * 执行页面级数据源请求
   */
  private async executePageDataSourceRequest(key: string, config: PageDataSource, extraParams?: Record<string, any>): Promise<any> {
    const store = getDataSourceState();
    const currentPromise = store.dataMap[key]?.promise;

    if (currentPromise) {
      return currentPromise;
    }

    const queryParams = store.queryParams[key] || {};
    const defaultParams = (config.params || []).reduce((acc: Record<string, string>, p) => {
      if (p.key) acc[p.key] = p.value;
      return acc;
    }, {});
    const defaultHeaders = (config.headers || []).reduce((acc: Record<string, string>, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {});

    const params = {
      ...defaultParams,
      ...queryParams,
      ...extraParams,
    };

    store.setData(key, { loading: true, error: null });

    const method = config.method || "get";
    const promise = request(config.url, {
      method,
      params: method === "get" ? params : undefined,
      data: method === "post" || method === "postJSON" ? params : undefined,
      headers: defaultHeaders,
    } as any)
      .then((data) => {
        store.setData(key, { data, loading: false, lastUpdate: Date.now(), promise: undefined });
        return data;
      })
      .catch((error) => {
        store.setData(key, { loading: false, error, promise: undefined });
        throw error;
      });

    store.setData(key, { promise });
    return promise;
  }
}

// 导出单例
export const dataSourceRegistry = DataSourceRegistry.getInstance();
