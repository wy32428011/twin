/**
 * 预览页面
 */
import React from "react";
import { useParams } from "react-router-dom";
import { getScreenDetail } from "@/services/bigScreenApi";
import { RbsEngine } from "@/export";
import { JsonType } from "@/engine";

export function saveLocalPreviewJson(json: JsonType): void {
  localStorage.setItem("preview_json", JSON.stringify(json));
}

export async function getLocalPreviewJson(): Promise<JsonType | undefined> {
  try {
    return JSON.parse(localStorage.getItem("preview_json") || "");
  } catch {
    return undefined;
  }
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const domRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (!id) {
      setError("No page id");
      return;
    }

    const rbsEngine = new RbsEngine();
    rbsEngine.enablePreview();

    rbsEngine.mount(domRef.current!).then(async () => {
      try {
        const res = await getScreenDetail(id);
        if (res?.success && res?.data?.jsonContent) {
          let json = JSON.parse(res.data.jsonContent);

          // 统一格式：如果 json 是数组，转为标准 JsonType 结构
          if (Array.isArray(json)) {
            json = {
              componentNodes: json,
              pages: [],
              config: {},
            };
          }

          rbsEngine.importJSON(json);
        } else if (res?.success === false && res?.code === "403") {
          setError("无权访问该大屏");
        } else {
          const json = await getLocalPreviewJson();
          if (json) {
            rbsEngine.importJSON(json);
          } else {
            setError(res?.message || "获取大屏详情失败");
          }
        }
      } catch (e: any) {
        if (e?.code === "403") {
          setError("无权访问该大屏");
        } else {
          setError(e?.message || String(e));
        }
      }
    }).catch((e) => {
      setError(String(e));
    });

    return () => {
      rbsEngine.destroy();
    };
  }, [id]);

  return (
    <>
      <div
        ref={domRef}
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      />
      {error && (
        <div style={{ position: "absolute", top: 20, left: 20, color: "red" }}>
          Error: {error}
        </div>
      )}
    </>
  );
}
