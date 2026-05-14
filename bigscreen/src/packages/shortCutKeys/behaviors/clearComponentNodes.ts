/**
 * 清空所有实例
 */
import { RbsEngine } from "@/export";

export function clearComponentNodes() {
  const engine = RbsEngine.getActiveEngine();
  engine?.componentNode?.clear?.();
}
