/**
 * BarChart (柱形图)
 */
import { useMemo } from "react";
import ReactECharts from "@/components/ReactECharts";
import { EChartsOption } from "echarts";
import { createComponent } from "@/engine";
import { BarChartOptions, DEFAULT_OPTIONS } from "./attributes";

export default createComponent<BarChartOptions>((props) => {
  const { width, height, options, dataSource } = props;

  const chartData = useMemo(() => {
    console.log("[BarChart] dataSource:", dataSource, typeof dataSource);

    let data = dataSource;

    if (typeof dataSource === "string") {
      try {
        data = JSON.parse(dataSource);
        console.log("[BarChart] parsed:", data);
      } catch (e) {
        console.error("[BarChart] parse error:", e);
        return null;
      }
    }

    if (data?.categories && data?.series) {
      return data;
    }

    return null;
  }, [dataSource]);

  const chartOption: EChartsOption = useMemo(() => {
    if (!chartData) {
      return { series: [] };
    }

    const categories = chartData.categories || [];
    const seriesItem = chartData.series?.[0];
    const seriesData = seriesItem?.data || [];

    return {
      tooltip: { trigger: "axis" as const },
      grid: {
        top: 40,
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: [
        {
          type: "category" as const,
          data: categories,
          show: options?.xAxisShow !== false,
          axisLine: { lineStyle: { color: "#fff" } },
          axisTick: { lineStyle: { color: "#fff" } },
          splitLine: { show: false },
        },
      ],
      yAxis: [
        {
          type: "value" as const,
          show: options?.yAxisShow !== false,
          axisLine: { lineStyle: { color: "#fff" } },
          axisTick: { lineStyle: { color: "#fff" } },
          splitLine: { lineStyle: { color: "rgba(255,255,255,0.4)", type: "dashed" as const } },
        },
      ],
      series: [
        {
          name: seriesItem?.name || "数据",
          type: "bar" as const,
          data: seriesData,
          barWidth: options?.barWidth || 20,
          barGap: options?.barGap,
          barCategoryGap: options?.barCategoryGap,
          itemStyle: {
            color: options?.barColor || "#1a44ea",
          },
        },
      ],
    };
  }, [chartData, options?.barWidth, options?.barGap, options?.barCategoryGap, options?.barColor, options?.xAxisShow, options?.yAxisShow]);

  return (
    <ReactECharts
      options={chartOption}
      style={{
        width,
        height,
        background: options?.background,
        borderRadius: options?.backgroundRadius,
      }}
    />
  );
}, DEFAULT_OPTIONS);