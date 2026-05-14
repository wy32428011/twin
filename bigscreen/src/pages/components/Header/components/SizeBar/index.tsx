/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:17
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-03 09:55:50
 * @FilePath: \react-big-screen-master\src\pages\components\Header\components\SizeBar\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * SizeBar
 */
import styles from "./index.module.less";
import { CloseOutlined } from "@ant-design/icons";
import InputNumberWithSuffix from "@/components/InputNumberWithSuffix";
import { useConfig } from "@/engine";
import ScaleSelect from "@/components/ScaleSelect";
import { useEngineContext } from "@/export/context";

export default function SizeBar() {
  const config = useConfig();
  const { engine } = useEngineContext();

  // console.log(config, 'ccccc');

  return (
    <div className={styles.sizeBar} id={"rbs-sizebar"}>
      <InputNumberWithSuffix
        suffix={"px"}
        value={config.width}
        onChange={(width: any) => {
          engine.config.setConfig({
            width,
          });
        }}
      />
      <CloseOutlined style={{ fontSize: 10 }} />
      <InputNumberWithSuffix
        suffix={"px"}
        value={config.height}
        onChange={(height: any) => {
          engine.config.setConfig({
            height,
          });
        }}
      />
      <ScaleSelect
        value={config.scale}
        onChange={(scale) => {
          engine.config.setConfig({
            scale,
          });
        }}
      />
    </div>
  );
}
