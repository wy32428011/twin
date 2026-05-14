/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:11:17
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-24 19:20:49
 * @FilePath: \react-big-screen-master\src\pages\components\Editor\hooks\useRegisterContextMenu\createEditorContextMenu.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 创建编辑器右键菜单项
 */
import {
  // BorderBottomOutlined,
  BorderOuterOutlined,
  ClearOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  clearComponentNodes,
  saveLocal,
  saveToBackend,
  selectAllComponentNodes,
  // unSelectAllComponentNodes,
} from "@/packages/shortCutKeys";
import { createContextMenu, ContextMenuItem } from "@/packages/contextMenu";
import { Engine } from "@/engine";

const INIT_CONTEXT_MENU: ContextMenuItem[] = [
  {
    key: "selectAll",
    title: "全选",
    icon: <BorderOuterOutlined />,
    onSelect: () => selectAllComponentNodes(),
  },
  // {
  //   key: "unselectAll",
  //   title: "反选",
  //   icon: <BorderBottomOutlined />,
  //   onSelect: () => unSelectAllComponentNodes(),
  // },
  {
    key: "clear",
    title: "清空",
    icon: <ClearOutlined />,
    onSelect: () => clearComponentNodes(),
  },
  {
    key: "saveLocal",
    title: "保存",
    icon: <SaveOutlined />,
    onSelect: () => {
      saveLocal(true); // 静默，saveToBackend 会提示
      saveToBackend();
    },
  },
];

export function createEditorContextMenu(e: MouseEvent, engine: Engine): Unmount | undefined {
  return createContextMenu(e.clientX, e.clientY, INIT_CONTEXT_MENU, {
    zIndex: engine?.componentNode?.getMaxLevel(),
  });
}
