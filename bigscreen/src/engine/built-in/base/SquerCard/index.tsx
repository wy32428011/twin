/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-03-26 16:54:55
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-26 18:29:36
 * @FilePath: \react-big-screen-master\src\engine\built-in\base\SquerCard\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * @description: 带边的infoCard
 */
import { createComponent } from "@/engine";
import { DEFAULT_OPTIONS, BackgroundOptions } from "./attributes";

export default createComponent<BackgroundOptions>((props) => {
  const { options, width, height } = props;
  return (
    <div style={{ width,
                  height,
                  background: options.borderColor,
                  borderRadius: options.borderRadius,
                  display: 'flex', alignItems: 'center', justifyContent: "center",}}>
      <div style={{width: width - Number(options.borderSize), height: height - Number(options.borderSize), background: options.background, borderRadius: options.borderRadius, display: 'flex', alignItems: 'center', justifyContent: options.align,}}>
        <div>
          <div style={{ color: options.labelColor, fontSize: options.labelFontSize, fontWeight: 400 }}>{options.label}</div>
          <div style={{ color: options.valueColor, fontSize: options.valueFontSize, fontWeight: 700 }}>{options.value ?? '--'}</div>
        </div>
      </div>
    </div>
  )
}, DEFAULT_OPTIONS);