/**
 * layout （布局组件）
 * */
import type { ComponentType } from "@/engine";
import { triggers as CarouselTriggers, exposes as CarouselExposes } from "./Carousel";
import React from "react";

export const layout: ComponentType[] = [
  {
    cId: "carousel",
    cName: "走马灯",
    icon: () => import("@/static/built-in/carousel.png"),
    category: "layout",
    x: 0,
    y: 0,
    width: 500,
    height: 250,
    component: React.lazy(() => import("./Carousel")),
    attributesComponent: React.lazy(() => import("./Carousel/attributes")),
    panels: [
      {
        label: "面板一",
        value: "",
      },
      {
        label: "面板二",
        value: "",
      },
    ],
    triggers: CarouselTriggers,
    exposes: CarouselExposes,
  },
  {
    cId: "specialCard",
    cName: "背景卡片",
    category: "layout",
    x: 0,
    y: 0,
    width: 410,
    height: 800,
    component: React.lazy(() => import("./SpecialCard")),
    attributesComponent: React.lazy(() => import("./SpecialCard/attributes")),
    icon: () => import("@/static/built-in/background.png"),
    panels: [{ label: "背景卡片", value: "" }],
  },
];
