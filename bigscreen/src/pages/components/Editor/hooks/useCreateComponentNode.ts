/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:17
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-23 20:28:03
 * @FilePath: \react-big-screen-master\src\pages\components\Editor\hooks\useCreateComponentNode.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 拖拽创建组件实例
 */
import { RefObject } from "react";
import { useVirtualDrop } from "@/packages/virtual-drag";
import { addHistory } from "@/packages/shortCutKeys";
import { useEngineContext } from "@/export/context";

export function useCreateComponentNode(containerDomRef: RefObject<HTMLElement>) {
  const { engine } = useEngineContext();
  useVirtualDrop(containerDomRef, {
    accept: ["create-component"],
    onDrop: (e: MouseEvent, dragOptions) => {
      const dom = containerDomRef.current;
      if (!dom) {
        throw new Error("dom must be exist.");
      }
      const { data } = dragOptions;
      const component = data?.component;
      if (!component) {
        return;
      }
      // 创建一个componentNode
      const domRect = dom.getBoundingClientRect();
      const scale = engine.config.getConfig().scale;
      const componentNode = engine.componentNode.createFromComponent(data.component, {
        x: Math.round((e.x - domRect.x) / scale), // 真实坐标转为编辑器坐标 （scale 越小，编辑器面积越小，真实像素变化映射到虚拟像素越大）
        y: Math.round((e.y - domRect.y) / scale),
        pageId: engine.config.getCurrentPage(),
      });
      // 插入新componentNode到末尾
      console.log("create componentNode:", componentNode);
      engine.componentNode.add(componentNode);
      setTimeout(async () => {
        // 选中新增的组件
        engine.instance.select(componentNode.id, true);
        addHistory(`新增一个组件 “${componentNode.cName}”`);
      });
    },
  });
}
