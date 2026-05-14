/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-02-25 16:04:16
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-29 22:01:03
 * @FilePath: \react-big-screen-master\src\engine\built-in\other\DefaultImage\attributes.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 预置图片-配置
 */
import { createAttributesByConfig } from "@/engine";
import ICustomSelect from "@/components/ICustomSelect";

export const DEFAULT_OPTIONS: ScrollListOptions = {
  id: "title.png",
};

export interface ScrollListOptions {
  // 预置图片id
  id?: string;
}

export default createAttributesByConfig<ScrollListOptions>(
  [
    <b key={"data"}>基本配置</b>,
    {
      key: "id",
      label: "选择图片",
      component: ({ value, onChange }) => {
        return (
          <ICustomSelect
            value={value}
            onChange={onChange}
            style={{ width: "100%" }}
            requestFn={async () => {
              return [
                { label: "安环图标", value: "anhuan.png" },
                { label: "返回图标", value: "button.png" },
                { label: "关闭图标", value: "close.png" },
                { label: "日期图标", value: "date.png" },
                { label: "电量图标", value: "dianliang.png" },
                { label: "信息图标", value: "info.png" },
                { label: "更多图标", value: "more.png" },
                { label: "能耗图标", value: "nenghao.png" },
                { label: "设备管理", value: "sbguangli.png" },
                { label: "搜索图标", value: "search.png" },
                { label: "生产管理", value: "shengchanguanli.png" },
                { label: "湿度图标", value: "shidu.png" },
                { label: "水量图标", value: "shuiliang.png" },
                { label: "标题图标", value: "title.png" },
                { label: "维保信息", value: "weibaoxinxi.png" },
                { label: "综合态势", value: "zonghetaishi.png" },
                { label: "烟感图标", value: "yangan.png" },
                { label: "闹钟", value: "clock.png" },
                { label: "主题背景-1", value: "bg-theme-1.jpeg" },
                { label: "主题背景-2", value: "bg-theme-2.jpg" },
                { label: "主题背景-3", value: "bg-theme-3.jpg" },
                { label: "主题背景-4", value: "bg-theme-4.jpg" },
                { label: "主题背景-5", value: "bg-theme-5.jpg" },
                { label: "主题背景-6", value: "bg-theme-6.jpg" },
                { label: "主题背景-7", value: "bg-theme-7.jpg" },
                { label: "组件底座-1", value: "com-bg-1.png" },
                { label: "组件底座-2", value: "com-bg-2.png" },
                { label: "组件底座-3", value: "com-bg-3.png" },
                { label: "组件底座-4", value: "com-bg-4.png" },
                { label: "组件底座-5", value: "com-bg-5.png" },
                { label: "组件底座-6", value: "com-bg-6.png" },
                { label: "头部-1", value: "title-1.png" },
                { label: "头部-2", value: "title-2.png" },
                { label: "头部-3", value: "title-3.png" },
                { label: "头部-4", value: "title-4.png" },
                { label: "基础素材-1", value: "base-1.png" },
                { label: "基础素材-2", value: "base-2.png" },
                { label: "基础素材-3", value: "base-3.png" },
                { label: "基础素材-4", value: "base-4.png" },
              ];
            }}
          />
        );
      },
    },
  ],
  DEFAULT_OPTIONS,
);
