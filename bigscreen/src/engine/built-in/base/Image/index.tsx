/**
 * Image（图片）
 */
import { Image } from "antd";
import { createComponent } from "@/engine";
import { DEFAULT_OPTIONS, ImageOptions } from "./attributes";

export default createComponent<ImageOptions>((props) => {
  const { options, width, height } = props;
  return (
    <Image
      src={options?.src}
      style={{ width, height, pointerEvents: "none" }}
      preview={!!options?.enablePreview}
    />
  );
}, DEFAULT_OPTIONS);
