import { app, dialog } from "electron";
import { join } from "path/posix";
import { readFileSync, readdirSync, unlinkSync, copyFileSync, existsSync, statSync } from "fs";

let _checkTimer: ReturnType<typeof setInterval> | null = null;

function getUpdateChannel(): string {
  try {
    const appPkgPath = join(app.getAppPath(), "package.json");
    const appPkg = JSON.parse(readFileSync(appPkgPath, "utf-8"));
    return appPkg.channel || "stable";
  } catch {
    return "stable";
  }
}

/**
 * 清空 temp 目录中的旧安装包。
 */
function cleanOldInstallers(): void {
  try {
    const tempDir = app.getPath("temp");
    for (const name of readdirSync(tempDir)) {
      if (name.startsWith("ZENDING Editor") && name.endsWith(".exe")) {
        unlinkSync(join(tempDir, name));
      }
    }
  } catch {}
}

/**
 * 从 SMB 共享目录检测并自动更新。
 * 仅在打包后生效。
 */
export function startUpdateChecker(): void {
  if (!app.isPackaged) return;

  cleanOldInstallers();

  const channel = getUpdateChannel();
  const serverPath =
    process.env.UPDATE_SERVER || "\\\\192.168.22.198\\updates";
  const updateJsonPath = join(serverPath, channel, "update.json");
  const localVersion = app.getVersion();

  console.log(`[Updater] 更新通道: ${channel}, 服务器: ${serverPath}`);

  // 首次启动后 5 秒检查一次，之后每 30 分钟检查
  setTimeout(() => checkForUpdate(updateJsonPath, localVersion), 5000);
  _checkTimer = setInterval(
    () => checkForUpdate(updateJsonPath, localVersion),
    30 * 60 * 1000
  );
}

export function stopUpdateChecker(): void {
  if (_checkTimer) {
    clearInterval(_checkTimer);
    _checkTimer = null;
  }
}

function checkForUpdate(
  updateJsonPath: string,
  localVersion: string,
): void {
  try {
    if (!existsSync(updateJsonPath)) {
      return;
    }

    const raw = readFileSync(updateJsonPath, "utf-8");
    const manifest = JSON.parse(raw);

    if (!manifest.version || !manifest.installer) {
      return;
    }

    if (manifest.version === localVersion) {
      return;
    }

    // semver 简单比较：拆分为数字
    if (!isNewerVersion(manifest.version, localVersion)) {
      return;
    }

    // 有新版本
    const serverDir = updateJsonPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    const installerUrl = join(serverDir, manifest.installer);

    if (!existsSync(installerUrl)) {
      console.warn(`[Updater] 找不到安装包: ${installerUrl}`);
      return;
    }

    // 下载到本地临时目录（已存在且大小一致则跳过）
    const tempPath = join(app.getPath("temp"), manifest.installer);
    const remoteSize = statSync(installerUrl).size;
    const localExists = existsSync(tempPath);
    if (!localExists || statSync(tempPath).size !== remoteSize) {
      copyFileSync(installerUrl, tempPath);
    }

    // 弹窗询问
    const result = dialog.showMessageBoxSync({
      type: "info",
      title: "发现新版本",
      message: `版本 ${manifest.version} 可用（当前 ${localVersion}），是否立即更新？`,
      detail: "应用将自动关闭并安装更新。",
      buttons: ["立即更新", "稍后提醒"],
      defaultId: 0,
    });

    if (result === 0) {
      // detach 安装进程后再退出，避免文件占用导致安装失败
      const { spawn } = require("child_process");
      spawn(tempPath, ["/S"], { detached: true, stdio: "ignore" }).unref();
      app.quit();
    }
  } catch (err) {
    // SMB 不可达是正常情况，静默跳过
  }
}

function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}
