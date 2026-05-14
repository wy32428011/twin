/**
 * API Configuration Service
 * @description 统一管理API配置，支持本地联调和生产环境切换
 */

// 环境配置
export interface ApiConfig {
  // 后端服务器地址
  baseUrl: string;
  // 是否启用本地联调（绕过后端，使用本地mock数据）
  localDebug: boolean;
  // API超时时间(ms)
  timeout: number;
}

// 本地联调配置
export const LOCAL_CONFIG: ApiConfig = {
  baseUrl: "http://192.168.22.60:8086",
  localDebug: true,
  timeout: 30000,
};

// 生产环境配置
export const PROD_CONFIG: ApiConfig = {
  baseUrl: "http://192.168.22.60:8086",
  localDebug: false,
  timeout: 30000,
};

// 根据环境获取配置
export function getApiConfig(): ApiConfig {
  // 通过VITE_API_DEBUG环境变量控制是否启用本地联调
  const isDebug = import.meta.env.VITE_API_DEBUG === "true" || import.meta.env.VITE_API_DEBUG === "1";
  return isDebug ? LOCAL_CONFIG : PROD_CONFIG;
}

// 动态修改API配置（用于运行时切换）
let currentConfig: ApiConfig = getApiConfig();

export function setApiConfig(config: Partial<ApiConfig>) {
  currentConfig = { ...currentConfig, ...config };
}

export function getCurrentApiConfig(): ApiConfig {
  return currentConfig;
}

// 构建完整API URL
export function buildApiUrl(path: string): string {
  return `${currentConfig.baseUrl}${path}`;
}

// 检查是否启用本地联调
export function isLocalDebug(): boolean {
  return currentConfig.localDebug;
}
