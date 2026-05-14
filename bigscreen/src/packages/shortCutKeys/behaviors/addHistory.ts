/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:14
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-24 11:19:19
 * @FilePath: \react-big-screen-master\src\packages\shortCutKeys\behaviors\addHistory.ts
 * @Description: engine.getJSON获取当前页的所有组件节点 并保存到历史记录中 每次保存是完整的的一份累加在历史记录数组中
 */
/**
 * 增加历史记录
 */
import { cloneDeep } from "lodash-es";
import { RbsEngine } from "@/export";

/**
 * 新增一条历史（对当前json拍摄快照）
 * @param description 描述文字
 */
export function addHistory(description: string) {
  setTimeout(async () => {
    const engine = RbsEngine.getActiveEngine();
    if (engine) {
      const json = await engine.getJSON();
      const cloned = cloneDeep(json);
      engine.history.add(cloned, description);
    }
  });
}
