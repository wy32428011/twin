/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-04-22 20:04:54
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-05-05 12:53:31
 * @FilePath: \react-big-screen-master\src\engine\built-in\charts\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * charts （图表组件）
 * */
import type { ComponentType } from "@/engine";
import React from "react";

export const charts: ComponentType[] = [
  {
    cId: "barChart",
    cName: "柱形图",
    icon: () => import("@/static/built-in/bar.png"),
    category: "charts",
    x: 0,
    y: 0,
    width: 350,
    height: 300,
    component: React.lazy(() => import("./BarChart")),
    attributesComponent: React.lazy(() => import("./BarChart/attributes")),
    dataSourceType: "static",
    staticDataSource: {
      categories: ["苹果", "三星", "小米", "oppo", "vivo"],
      series: [
        {
          name: "手机品牌",
          type: "bar",
          data: [1000879, 3400879, 2300879, 5400879, 3400879],
        },
      ],
    },
  },
];
