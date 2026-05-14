/**
 * DataSource
 */
import { Line, LineConfigProvider } from "@/components/Attributes";
import ICustomSelect from "@/components/ICustomSelect";
import styles from "./index.module.less";
import { useSingleSelectedInstance } from "../..";
import { DataSourceType } from "@/engine";
import DataSourceKeyConfig from "./components/DataSourceKeyConfig";
import { useEngineContext } from "@/export/context";

const dataSourceTypeOptions: { label: string; value: DataSourceType }[] = [
  { label: "静态数据", value: "static" },
  { label: "API接口", value: "request" },
  { label: "组合模式", value: "combined" },
];

export default function () {
  const { engine } = useEngineContext();
  const { componentNode } = useSingleSelectedInstance();
  const dataSourceType = componentNode?.dataSourceType ?? "static";

  return (
    <LineConfigProvider labelSpan={5}>
      <div className={styles.dataSource}>
        <Line label={"数据源"}>
          <ICustomSelect
            value={dataSourceType}
            allowClear={false}
            style={{ width: "100%" }}
            requestFn={async () => dataSourceTypeOptions}
            onChange={(dataSourceType: any) => {
              engine.componentNode.update(componentNode?.id, {
                dataSourceType,
              });
            }}
          />
        </Line>
        {/* 统一使用新的 DataSourceKeyConfig */}
        <DataSourceKeyConfig style={{ flex: 1, overflow: "hidden" }} />
      </div>
    </LineConfigProvider>
  );
}
