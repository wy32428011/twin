import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const CHANGELOG_PATH = join(ROOT, "..", "CHANGELOG.md");

const SECTION_MAP = {
  feat: "### 新增",
  fix: "### 修复",
  refactor: "### 变更",
  perf: "### 优化",
  chore: "### 杂项",
  docs: "### 文档",
  test: "### 测试",
};

function getTags() {
  try {
    return execSync("git tag --sort=-creatordate", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getCommitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : "";
  const log = execSync(
    `git log ${range} --pretty=format:"%s"`,
    { encoding: "utf-8" }
  ).trim();

  if (!log) return [];

  return log
    .split("\n")
    .filter((line) => line && !line.startsWith("chore: bump version"))
    .map((line) => {
      const match = line.match(/^(\w+):\s*(.+)/);
      return match
        ? { type: match[1], message: match[2] }
        : { type: "chore", message: line };
    });
}

function generateEntries(commits) {
  const grouped = {};
  for (const { type, message } of commits) {
    const section = SECTION_MAP[type] ?? "### 杂项";
    grouped[section] ??= [];
    grouped[section].push(`- ${message}`);
  }

  return Object.entries(grouped)
    .map(([section, items]) => `${section}\n${items.join("\n")}`)
    .join("\n\n");
}

function updateChangelog() {
  const content = readFileSync(CHANGELOG_PATH, "utf-8");

  const tags = getTags();
  const latestTag = tags[0] ?? null;
  const commits = getCommitsSinceTag(latestTag);

  if (commits.length === 0) {
    console.log("没有新的提交需要记录。");
    return;
  }

  const entries = generateEntries(commits);

  // 替换整个 [未发布] 区块（从 ## [未发布] 到下一个 ## [）
  const unreleasedRegex = /(## \[未发布\]\n)[\s\S]*?(?=\n## \[)/;
  if (unreleasedRegex.test(content)) {
    const newContent = content.replace(unreleasedRegex, `$1\n${entries}\n`);
    writeFileSync(CHANGELOG_PATH, newContent, "utf-8");
  } else {
    // 没有 [未发布] 区块，插入到文件头
    const newContent = content.replace(
      /(# Changelog\n)/,
      `$1\n## [未发布]\n\n${entries}\n`
    );
    writeFileSync(CHANGELOG_PATH, newContent, "utf-8");
  }

  console.log(`CHANGELOG.md 已更新（${commits.length} 条新提交）。`);
}

updateChangelog();
