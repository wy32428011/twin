/**
 * 注册快捷键事件
 */
import { useEffect } from "react";
import { registerShortCutKeys, RegisterShortCutKeysMap } from "@/packages/shortCutKeys/utils";

export function useShortCutKeys(shortCutKeysMap: RegisterShortCutKeysMap) {
  useEffect(() => {
    return registerShortCutKeys(shortCutKeysMap);
  }, []);
}
