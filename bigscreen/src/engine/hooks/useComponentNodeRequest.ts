/**
 * useComponentNodeRequest
 * @description 负责组件数据源请求
 * @description 支持三种模式：
 *   - static: 静态数据，使用 componentNode.staticDataSource
 *   - request: 单组件API，使用 componentNode.request 配置
 *   - combined: 页面级API，使用 componentNode.pageDataSourceKey
 */
import { ComponentNodeType } from "@/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useListenRef } from "@/hooks";
import { dataSourceRegistry, useDataSourceStore } from "@/packages/dataSource";
import { RbsEngine } from "@/export";

type DataSource = any;

export function useComponentNodeRequest(componentNode: ComponentNodeType): {
  dataSource: DataSource;
  requestInstance: {
    reload: () => void;
    request: (params?: Record<string, any>, noCache?: boolean) => Promise<any>;
  };
} {
  const { dataSourceType = "static", pageDataSourceKey, request } = componentNode;
  const isStaticRef = useListenRef(dataSourceType === "static");
  const isCombinedRef = useListenRef(dataSourceType === "combined");

  // 单组件 API 请求数据（request 模式）
  const [apiDataSource, setApiDataSource] = useState<any>();
  const requestManagerRef = useRef<any>();

  // 组合模式：使用 pageDataSourceKey
  useEffect(() => {
    if (isCombinedRef.current && pageDataSourceKey) {
      dataSourceRegistry.fetch(pageDataSourceKey);
    }
  }, [componentNode?.dataSourceType, pageDataSourceKey]);

  // 单组件 API 模式：使用 requestManager
  useEffect(() => {
    if (isStaticRef.current || isCombinedRef.current) {
      return;
    }

    // request 模式 - 使用 RequestManager
    const { url } = request || {};

    if (!url) return;

    // 创建请求管理器
    if (!requestManagerRef.current) {
      requestManagerRef.current = {
        requestConfig: request,
        timerId: null as any,
        callbackList: [] as any[],

        notifyDataSource(data: any) {
          this.callbackList.forEach((cb: any) => cb(data));
        },

        clear() {
          if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
          }
        },

        reload(cfg?: any) {
          this.clear();
          const config = cfg || this.requestConfig;
          if (!config?.url) return;

          if (config.first) {
            this.request();
          }
          if (config.loop) {
            this.timerId = setInterval(() => {
              this.request();
            }, config.loopDelay || 1000);
          }
        },

        async request(params?: Record<string, any>) {
          const config = this.requestConfig;
          if (!config?.url) {
            console.warn("[bigScreen]: request.url not exist.");
            return Promise.resolve(undefined);
          }

          // 执行请求
          const { default: requestFn } = await import("@/packages/request/request");
          return requestFn(config.url, {
            method: config.method || "get",
            params,
          }).then((dataSource: any) => {
            this.notifyDataSource(dataSource);
            return dataSource;
          });
        },

        unmount() {
          this.callbackList = [];
          this.requestConfig = undefined;
          this.clear();
        },

        onChangeDataSource(callback: any) {
          this.callbackList.push(callback);
          return () => {
            this.callbackList = this.callbackList.filter((cb: any) => cb !== callback);
          };
        },
      };
    }

    requestManagerRef.current.onChangeDataSource((data: any) => setApiDataSource(data));
    requestManagerRef.current.reload(request);

    return () => {
      requestManagerRef.current?.unmount();
      requestManagerRef.current = undefined;
    };
  }, [componentNode?.dataSourceType, JSON.stringify(request)]);

  // 订阅 store 中的数据变化
  const dataMap = useDataSourceStore((state) => state.dataMap);

  // 从 store 获取最新数据
  const resultDataSource = useMemo(() => {
    if (isStaticRef.current) {
      // 静态数据优先从 componentNode 获取，其次从组件模板获取
      if (componentNode?.staticDataSource !== undefined) {
        return componentNode.staticDataSource;
      }
      // 从组件模板获取 staticDataSource
      const engine = RbsEngine.getActiveEngine();
      const component = engine?.component?.get(componentNode?.cId);
      return component?.staticDataSource;
    }

    if (isCombinedRef.current && pageDataSourceKey) {
      return dataMap?.[pageDataSourceKey]?.data;
    }

    // request 模式 - 使用 apiDataSource
    return apiDataSource;
  }, [componentNode?.staticDataSource, componentNode?.cId, pageDataSourceKey, apiDataSource, dataMap]);

  const requestInstance = useMemo(() => {
    return {
      reload() {
        if (isStaticRef.current) {
          return;
        }
        if (isCombinedRef.current && pageDataSourceKey) {
          dataSourceRegistry.refresh(pageDataSourceKey);
          return;
        }
        // request 模式
        requestManagerRef.current?.reload?.(request);
      },
      async request(params?: Record<string, any>, _noCache?: boolean): Promise<any> {
        if (isStaticRef.current) {
          return;
        }
        if (isCombinedRef.current && pageDataSourceKey) {
          return dataSourceRegistry.fetch(pageDataSourceKey, params);
        }
        // request 模式
        return requestManagerRef.current?.request?.(params);
      },
    };
  }, [pageDataSourceKey, JSON.stringify(request)]);

  return {
    dataSource: resultDataSource,
    requestInstance,
  };
}