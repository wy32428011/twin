/**
 * request
 */
import request, { RequestMethod } from "umi-request";

// 错误信息接口
export interface ApiError {
  code: string;
  message: string;
  success: boolean;
}

// 响应数据结构
export interface ApiResponse<T = any> {
  code: string | number;
  data: T;
  message: string;
  success: boolean;
}

// 请求配置扩展
export interface RequestOptions extends RequestInit {
  useCache?: boolean;
  ttl?: number;
}

// 扩展 request 类型以支持 getResponse
interface ExtendedRequestMethod extends RequestMethod {
  (url: string, options?: any): Promise<any>;
}

// 添加响应拦截器 - 统一处理错误
(request as ExtendedRequestMethod).interceptors.response.use(async (response: any) => {
  // 获取原始响应数据
  let data: any = null;
  try {
    data = await response.clone().json().catch(() => response);
  } catch (e) {
    data = response;
  }

  // HTTP 错误（状态码非 200）或业务 success: false
  if (response.status !== 200 || (data && data.success === false)) {
    const errorMsg = data?.message || data?.msg || `请求失败 (${response.status})`;
    const errorCode = data?.code;
    const error: any = new Error(errorMsg);
    error.response = data;
    error.code = errorCode;
    error.status = response.status;
    error.isApiError = true;
    return Promise.reject(error);
  }
  return data || response;
});

(request as ExtendedRequestMethod).interceptors.request.use((url: string, options: any) => {
  // 是否启用接口缓存
  if (options?.useCache === undefined) {
    options.useCache = true;
    if (options.ttl === undefined) {
      options.ttl = 2000;
    }
  }
  return {
    url,
    options,
  };
});

export default request as ExtendedRequestMethod;