/**
 * 步骤引导按钮
 */
import { Button } from "antd";
import { startDriver } from "@/utils";

export default function StepDriverButton() {
  return (
    <Button
      size={"small"}
      style={{ fontSize: 12 }}
      id={"rbs-starter-help"}
      onClick={() => {
        startDriver(true);
      }}
    >
      新手教程
    </Button>
  );
}
