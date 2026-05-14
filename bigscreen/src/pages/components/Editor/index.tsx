/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:16
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-23 20:07:49
 * @FilePath: \react-big-screen-master\src\pages\components\Editor\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * Editor
 */
import styles from "./index.module.less";
import { ComponentNodeType, usePackages } from "@/engine";
import { useEffect, useMemo, useRef } from "react";
import { useComponentNodes } from "@/engine";
import RenderComponentNode from "./components/RenderComponentNode";
import { unSelectAllComponentNodes } from "@/packages/shortCutKeys";
import PageContainer from "./components/PageContainer";
import {
  useRegisterDrag,
  useCreateComponentNode,
  useRegisterContextMenu,
  useCreateFavorite,
} from "./hooks";
import { useEngineContext } from "@/export/context";

export default () => {
  const { engine } = useEngineContext();
  const editorDomRef = useRef<HTMLDivElement>(null);
  const innerEditorDomRef = useRef<HTMLDivElement>(null);

  // 组件包
  const packages = usePackages();
  // console.log("packages", packages);
  // 展示的 componentNodes
  const componentNodes: ComponentNodeType[] = useComponentNodes();
  // console.log("componentNodes", componentNodes);

  // 渲染实例列表
  const renderComponentNodes = useMemo(() => {
    // console.log("renderComponentNodes", componentNodes);
    if (!packages.length) {
      return;
    }
    return componentNodes?.map((componentNode: ComponentNodeType) => {
      return (
        <RenderComponentNode
          key={componentNode.id}
          componentNode={componentNode}
          packages={packages}
        />
      );
    });
  }, [componentNodes, packages]);

  // 注册拖拽相关
  useRegisterDrag(innerEditorDomRef);

  // 注册右键菜单
  useRegisterContextMenu(editorDomRef);

  // 拖拽创建实例
  useCreateComponentNode(innerEditorDomRef);

  // 拖拽创建favorite
  useCreateFavorite(innerEditorDomRef);

  // 监听页面组件删除
  useEffect(() => {
    // 删除 componentNode时，从page的globalComponents中移除，表示不再是一个全局组件
    return engine.componentNode.onDelete((ids) => {
      engine.page.removeGlobalComponentNode(ids);
    });
  }, []);

  return (
    <div
      ref={editorDomRef}
      className={styles.editor}
      onMouseDown={() => unSelectAllComponentNodes()}
    >
      <PageContainer ref={innerEditorDomRef} className={styles.editor_render}>
        {renderComponentNodes}
      </PageContainer>
    </div>
  );
};
