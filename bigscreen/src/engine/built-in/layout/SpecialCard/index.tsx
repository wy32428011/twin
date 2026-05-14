/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:15
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-29 22:27:01
 * @FilePath: \react-big-screen-master\src\engine\built-in\layout\SpecialCard\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * SpecialCard（特殊卡片）
 */
import styles from "./index.module.less";
import { createComponent } from "@/engine";
import { SpecialCardOptions, DEFAULT_OPTIONS } from "./attributes";

export default createComponent<SpecialCardOptions>((props) => {
  const { options } = props;
  return (
    <div
      className={styles.specialCard}
      style={{
        borderRadius: options?.borderRadius,
        background: options?.background,
      }}
    >
      <div className={styles.specialCard_head}>
        {/* <div className={styles.specialCard_head_title}>{options?.title}</div> */}
      </div>
    </div>
  );
}, DEFAULT_OPTIONS);
