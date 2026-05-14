import { join } from "node:path";
import { readFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { argv } from "node:process";

const ROOT = join(import.meta.dirname, "..");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

// 默认上传目标：SMB 共享地址，可通过环境变量覆盖
const baseServer =
  process.env.UPDATE_SERVER || "\\\\192.168.22.198\\updates";

const serverPath = argv[2] || baseServer;

const files = [
  {
    label: "正式版",
    srcDir: join(ROOT, "electron-packages"),
    dstDir: join(serverPath, "stable"),
    installer: `ZENDING Editor Setup ${PKG.version}.exe`,
  },
  {
    label: "开发版",
    srcDir: join(ROOT, "electron-packages", "dev"),
    dstDir: join(serverPath, "dev"),
    installer: `ZENDING Editor Dev Setup ${PKG.version}.exe`,
  },
];

console.log(`上传目标: ${serverPath}\n`);

for (const { label, srcDir, dstDir, installer } of files) {
  const updateJson = join(srcDir, "update.json");
  const installerPath = join(srcDir, installer);

  if (!existsSync(updateJson)) {
    console.error(`[${label}] 跳过: 缺少 update.json`);
    continue;
  }
  if (!existsSync(installerPath)) {
    console.error(`[${label}] 跳过: 缺少 ${installer}`);
    continue;
  }

  mkdirSync(dstDir, { recursive: true });

  cpSync(updateJson, join(dstDir, "update.json"));
  console.log(`[${label}] update.json → ${dstDir}\\update.json`);

  cpSync(installerPath, join(dstDir, installer));
  console.log(`[${label}] ${installer} → ${dstDir}\\${installer}`);
}

console.log("\n上传完成。");
