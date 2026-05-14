/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:13
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-19 19:37:36
 * @FilePath: \react-big-screen-master\src\export\components\RenderEditor\index.tsx
 * @Description: 编辑器页面结构
 */
import styles from "./index.module.less";
import Header, { RbsEditorHeaderProps } from "@/pages/components/Header";
import Menu from "@/pages/components/Menu";
import Editor from "@/pages/components/Editor";
import Attributes from "@/pages/components/Attributes";
import { JsonType, Engine, useCurrentPageId } from "@/engine";
import React from "react";
import { useGlobalShortCutKeys } from "@/packages/shortCutKeys";
import { usePageSync, ApiDebugPanel, isLocalDebug } from "@/services";

export interface RbsEditorProps extends RbsEditorHeaderProps {
  /** json数据 */
  json?: JsonType;
  /** 低代码内核 */
  engine: Engine;
  /** 页面底部 */
  pageFooter?: React.FC | React.ReactNode;
  /** json加载完成回调 */
  onJSONLoad?: () => void;
  /** 是否显示调试面板 */
  showDebugPanel?: boolean;
}

export default function (props: RbsEditorProps) {
  const { engine, json, pageFooter: PageFooter, showDebugPanel } = props;

  const currentPageId = useCurrentPageId();

  // 注册快捷键
  useGlobalShortCutKeys();

  // 启用页面同步
  const { loadScreenData, saveScreenData } = usePageSync(engine);

  // 加载JSON
  React.useEffect(() => {
    engine.loadJSON(json).then(() => {
      props?.onJSONLoad?.();
    });
  }, []);

  // 页面切换时加载新页面数据
  React.useEffect(() => {
    if (currentPageId) {
      loadScreenData(currentPageId);
    }
  }, [currentPageId]);

  // 监听页面变化，自动保存
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPageId) {
        const components = engine.componentNode.getAll();
        saveScreenData(currentPageId, components);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentPageId, engine, saveScreenData]);

  // 显示调试面板（仅本地联调模式）
  const showDebug = showDebugPanel !== false && isLocalDebug();

  return (
    <div className={styles.page}>
      <div className={styles.page_header}>
        <Header
          pageLogo={props?.pageLogo}
          pageToolBar={props?.pageToolBar}
          toolBarOptions={props?.toolBarOptions}
        />
      </div>
      <div className={styles.page_body}>
        <div className={styles.page_body_left} id={"rbs-menu"}>
          <Menu />
        </div>
        {/* 如果有currentid 才显示属性面板 和 画布 删除所有页面后要将currentid置空 */}
        {currentPageId && (
          <>
            <div className={styles.page_body_main} id={"rbs-editor"}>
              <Editor />
            </div>
            <div className={styles.page_body_right} id={"rbs-attributes"}>
              <Attributes />
            </div>
          </>
        )}


      </div>
      {typeof PageFooter === "function" ? <PageFooter /> : PageFooter}
      {showDebug && <ApiDebugPanel />}
    </div>
  );
}
