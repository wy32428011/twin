/**
 * useComponents
 * @description 获取全部已注册组件模板
 */
import { ComponentType, useGlobalSelector } from "..";
import { useMemo } from "react";

export function useComponents(): ComponentType[] {
  const componentMap = useGlobalSelector((state) => state.componentMap);

  return useMemo((): ComponentType[] => {
    return componentMap ? Object.values(componentMap) : [];
  }, [componentMap]);
}
