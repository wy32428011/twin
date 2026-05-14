/**
 * DataSource 数据源模块类型定义
 */

// 数据源配置（注册到 Registry）
export interface DataSourceConfig {
  key: string; // 唯一标识（如 "chartA"）
  url: string; // 请求地址
  method: "get" | "post"; // 请求方法
  params?: Record<string, any>; // 默认参数
  headers?: Record<string, string>; // 请求头
}

// 全局查询参数（Input 等写入）
export interface QueryParams {
  [key: string]: Record<string, any>;
}

// 数据状态
export interface DataItem {
  data: any; // 数据
  loading: boolean; // 加载中
  error: Error | null; // 错误
  lastUpdate: number; // 更新时间戳
  promise?: Promise<any>; // 当前请求 Promise（用于去重）
}

// Store State
export interface DataSourceState {
  // 数据缓存 key -> DataItem
  dataMap: Record<string, DataItem>;
  // 全局查询参数
  queryParams: QueryParams;
  // 依赖追踪 key -> Set<componentId>
  subscriptions: Record<string, Set<string>>;
}