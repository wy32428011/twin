/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:16
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-04-20 16:08:08
 * @FilePath: \react-big-screen-master\src\pages\components\Attributes\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * Attributes
 */
import styles from "./index.module.less";
import { useMemo } from "react";
import { useSelectedInstances } from "@/engine";
import SingleInstanceAttributes from "./components/SingleInstanceAttributes";
import MultipleInstanceAttributes from "./components/MultipleInstanceAttributes";
import PageAttributes from "./components/PageAttributes";

export default function Attributes() {
  const selectedInstances = useSelectedInstances();
  const isSelected = useMemo(() => !!selectedInstances.length, [selectedInstances]);
  const isSingleInstance = useMemo(() => selectedInstances.length === 1, [selectedInstances]);
  return (
    <div className={styles.attributes}>
      {isSelected ? (
        // 选中组件实例配置
        <>
          {/* 单实例配置 */}
          {isSingleInstance && <SingleInstanceAttributes instance={selectedInstances[0]} />}
          {/* 多实例配置 */}
          {!isSingleInstance && <MultipleInstanceAttributes instances={selectedInstances} />}
        </>
      ) : (
        // 默认页面配置
        <PageAttributes />
      )}
    </div>
  );
}
