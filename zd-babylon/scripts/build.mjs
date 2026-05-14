import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { arch } from "node:os";

import dotEnv from "dotenv";
import yargs from "minimist";
import Builder from "electron-builder";

dotEnv.config();
const args = yargs(process.argv.slice(2));

const architecture = arch();
const PKG = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf-8"));

const baseConfig = {
	win: {
		target: "nsis",
		forceCodeSigning: false,
	},
	fileAssociations: [
		{
			ext: "bjseditor",
			name: "ZENDING Editor Project",
		},
	],
	appId: "cn.zdjc.editor",
	productName: "ZENDING Editor",
	icon: "./icons/babylonjs_icon",
	directories: {
		output: "./electron-packages/",
	},
	nsis: {
		oneClick: false,
		allowElevation: true,
		allowToChangeInstallationDirectory: true,
	},
	linux: {
		target: "AppImage",
	},
	asar: true,
	asarUnpack: ["**/node_modules/sharp/**/*", "**/node_modules/@img/**/*"],
	compression: "normal",
	extraFiles: ["bin/**", "templates/**", "release-notes.txt"],
	files: ["./build/**", "./fonts/**", "./assets/**", "./index.html"],
	extraMetadata: { channel: "stable" },
};

const devConfig = {
	...baseConfig,
	appId: "cn.zdjc.editor.dev",
	productName: "ZENDING Editor Dev",
	directories: { output: "./electron-packages/dev/" },
	extraMetadata: { debug: true, channel: "dev" },
};

function build(config, opts) {
	return Builder.build({
		x64: opts.x64,
		arm64: opts.arm64,
		projectDir: ".",
		config: structuredClone(config),
	});
}

// Remove old build
await rm(join(import.meta.dirname, "./electron-packages"), {
	force: true,
	recursive: true,
});

// Determine architecture targets
const targets = {
	x64: args.x64 ?? (architecture === "x64"),
	arm64: args.arm64 ?? (architecture === "arm64"),
};

// Build both production and dev
await build(baseConfig, targets);
await build(devConfig, targets);

// Generate update manifests
function generateUpdateJson(outputDir, productName) {
  const manifest = {
    version: PKG.version,
    installer: `${productName} Setup ${PKG.version}.exe`,
    releaseNotes: "release-notes.txt",
  };
  writeFileSync(
    join(outputDir, "update.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );
}

await generateUpdateJson("./electron-packages/", baseConfig.productName);
await generateUpdateJson("./electron-packages/dev/", devConfig.productName);

console.log("\n打包完成。执行 node scripts/upload.mjs 上传更新。");
console.log("推送代码: git push && git push --tags");
