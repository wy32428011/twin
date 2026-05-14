/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-05-05 13:55:14
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-05-05 14:27:15
 * @FilePath: \react-big-screen-master\src\pages\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 编辑页面
 */
import React from "react";
import { RbsEngine } from "@/export";
import { openRoute, startDriver } from "@/utils";
import { saveLocalPreviewJson } from "@/pages/preview";
import { saveLocal, saveToBackend } from "@/packages/shortCutKeys";
// import Footer from "./components/Footer";

export default function Page() {

  const domRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const rbsEngine = new RbsEngine({
      // pageFooter: Footer,
    });
    rbsEngine.mount(domRef.current!).then(async () => {
      startDriver();
    });

    // 监听"点击开始预览"事件
    rbsEngine.on("startPreview", async (engine) => {
      // 先保存数据，确保最新组件数据
      saveLocal(true);
      await saveToBackend(true);
      const json = await engine.getJSON();
      saveLocalPreviewJson(json);
      const pageId = engine.config.getCurrentPage();
      openRoute(`/preview/${pageId}`, false);
    });

    return () => {
      rbsEngine.destroy();
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
}
