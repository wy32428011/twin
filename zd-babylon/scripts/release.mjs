import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argv, exit } from "node:process";

const ROOT = join(import.meta.dirname, "..");
const PKG_PATH = join(ROOT, "package.json");

const BUMP_TYPES = ["patch", "minor", "major"];

const bumpType = argv[2];
if (!bumpType || !BUMP_TYPES.includes(bumpType)) {
  console.error(`用法: node scripts/release.mjs <${BUMP_TYPES.join("|")}>`);
  exit(1);
}

// 1. 检查工作区是否干净
const status = execSync("git status --porcelain", { encoding: "utf-8" });
if (status.trim()) {
  console.error("错误: 工作区不干净，请先提交所有变更。");
  console.error(status);
  exit(1);
}

// 2. 更新 CHANGELOG
execSync("node scripts/gen-changelog.mjs", {
  encoding: "utf-8",
  cwd: ROOT,
  stdio: "inherit",
});

// 3. 读取当前版本号并计算新版本
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
const oldVersion = pkg.version;
const [major, minor, patch] = oldVersion.split(".").map(Number);
const newVersion = {
  patch: `${major}.${minor}.${patch + 1}`,
  minor: `${major}.${minor + 1}.0`,
  major: `${major + 1}.0.0`,
}[bumpType];

pkg.version = newVersion;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

// 4. 将 CHANGELOG 中的 [未发布] 替换为 [x.y.z]
const changelogPath = join(ROOT, "CHANGELOG.md");
let changelog = readFileSync(changelogPath, "utf-8");
const today = new Date().toISOString().split("T")[0];
const versionHeader = `## [${newVersion}] — ${today}`;
changelog = changelog.replace("## [未发布]", versionHeader);
writeFileSync(changelogPath, changelog, "utf-8");

// 5. 提取当前版本 release notes（截取到下一个 ## [ 为止）
const escapedHeader = versionHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sectionRegex = new RegExp(`${escapedHeader}\\n([\\s\\S]*?)(?=\\n## \\[|$)`);
const match = changelog.match(sectionRegex);
const releaseNotes = match
  ? `${pkg.productName ?? "ZENDING Editor"} ${newVersion}\n\n${match[1].trim()}\n`
  : `${pkg.productName ?? "ZENDING Editor"} ${newVersion}\n`;
writeFileSync(join(ROOT, "release-notes.txt"), releaseNotes, "utf-8");

// 6. 提交版本更新并打 tag
execSync(`git add CHANGELOG.md package.json release-notes.txt`, { cwd: ROOT });
execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: ROOT });
execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { cwd: ROOT });

console.log(`\n版本已更新: ${oldVersion} → ${newVersion}`);
console.log(`Tag: v${newVersion}`);
console.log(`Release notes: release-notes.txt`);
console.log(`\n运行 yarn package 打包。`);
console.log(`完成后执行: git push && git push --tags`);
