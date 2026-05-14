/**
 * 页面组件下拉框
 */
import ICustomSelect, { ICustomSelectProps } from "@/components/ICustomSelect";
import { useEngineContext } from "@/export/context";

export default function ComponentNodesSelect(props: ICustomSelectProps) {
  const { engine } = useEngineContext();
  return (
    <ICustomSelect
      {...props}
      requestFn={async () => {
        return engine.componentNode.getAll().map((componentNode) => {
          return {
            label: componentNode.name,
            value: componentNode.id,
          };
        });
      }}
    />
  );
}
