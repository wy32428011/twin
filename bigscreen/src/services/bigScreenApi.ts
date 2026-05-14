/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-04-25 16:29:26
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-04-28 09:11:53
 * @FilePath: \react-big-screen-master\src\services\bigScreenApi.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * BigScreen API Service
 * @description 大屏的增删改查API
 * @description 开发环境下通过 Vite 代理转发到 http://192.168.22.60:8086
 */
import request from "@/packages/request/request";

// ============ 树结构 ============

/**
 * 获取项目和页面树结构
 */
export async function getTreeData() {
  return request(`/api/v1/integration/project-screens/tree`, {
    method: "POST",
    useCache: false,
  });
}

// ============ 大屏CRUD ============

/**
 * 新增大屏
 */
export async function createScreen(data: {
  screenName: string;
  projectId: string | number;
}) {
  return request(`/api/v1/integration/screens/create`, {
    method: "POST",
    data,
    useCache: false,
  });
}

/**
 * 大屏更新/保存统一接口
 * @description 更新大屏信息或保存组件数据到大屏，统一调用此接口
 */
export async function updateScreen(data: {
  id: string | number;
  projectId?: string | number;
  screenName?: string;
  screenCode?: string;
  screenUrl?: string;
  thumbnailUrl?: string;
  jsonContent?: string;
  remark?: string;
  updatedAt?: string;
}) {
  return request(`/api/v1/integration/screens/update`, {
    method: "POST",
    data: {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    },
    useCache: false,
  });
}

/**
 * 删除大屏
 */
export async function deleteScreen(id: string) {
  return request(`/api/v1/screens/delete`, {
    method: "POST",
    data: {
      id,
    },
    useCache: false,
  });
}

// ============ 大屏组件数据 ============

/**
 * 获取大屏详情
 */
export async function getScreenDetail(id: string) {
  return request(`/api/v1/screens/detail`, {
    method: "POST",
    data: {
      id,
    },
    useCache: false,
  });
}