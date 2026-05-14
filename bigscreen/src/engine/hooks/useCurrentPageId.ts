/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:18
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-19 10:42:31
 * @FilePath: \react-big-screen-master\src\engine\hooks\useCurrentPageId.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * useCurrentPageId
 * @description 获取当前页id
 */
import { useGlobalSelector } from "@/engine";
// import { DEFAULT_PAGE } from "@/engine/page";

export function useCurrentPageId(): string | null | undefined {
  return useGlobalSelector((state) => state?.config?.currentPageId);
}
