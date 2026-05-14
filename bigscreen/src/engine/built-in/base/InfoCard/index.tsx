/**
 * @description: infoCard
 */
import { createComponent } from "@/engine";
import { DEFAULT_OPTIONS, BackgroundOptions } from "./attributes";

export default createComponent<BackgroundOptions>((props) => {
  const { options, width, height } = props;
  return (
    <div style={{ width, height, background: options.background, borderRadius: options.borderRadius, display: 'flex', alignItems: 'center', justifyContent: options?.align, padding: 16 }}>
      <div>
        <div style={{ color: options.labelColor, fontSize: options.labelFontSize, fontWeight: 400 }}>{options.label}</div>
        <div style={{ color: options.valueColor, fontSize: options.valueFontSize, fontWeight: 700 }}>{options.value ?? '--'}</div>
      </div>
    </div>
  )
}, DEFAULT_OPTIONS);