import { Scene, Node } from "babylonjs";

const _classIcon: Record<string, string> = {
    Mesh: "⬡",
    GroundMesh: "▦",
    AbstractMesh: "◇",
    TransformNode: "○",
    Light: "☀",
    Camera: "◎",
};

function icon(node: any): string {
    return _classIcon[node.getClassName?.()] ?? "·";
}

function brief(node: any): string {
    const name = node.name || "(unnamed)";
    const cls = node.getClassName?.() || "Node";
    if (node.metadata?.clonedFrom) {
        return `${icon(node)} ${name} [${cls}] → clone of ${node.metadata.clonedFrom}`;
    }
    if (node.metadata?.cloneForEditor) {
        return `${icon(node)} ${name} [${cls}] (editor clone)`;
    }
    return `${icon(node)} ${name} [${cls}]`;
}

export function printNodeTree(scene: Scene): void {
    const lines: string[] = [];

    function walk(node: Node, prefix: string, isLast: boolean) {
        const connector = isLast ? "└─ " : "├─ ";
        lines.push(prefix + connector + brief(node));

        const children = node.getChildren?.() ?? [];
        const newPrefix = prefix + (isLast ? "    " : "│   ");

        for (let i = 0; i < children.length; i++) {
            walk(children[i], newPrefix, i === children.length - 1);
        }
    }

    lines.push((scene as any).name || "Scene");
    const roots = [
        ...scene.rootNodes,
        ...scene.meshes.filter((m) => !m.parent),
        ...scene.lights.filter((l) => !(l as any).parent),
        ...scene.cameras.filter((c) => !(c as any).parent),
    ];
    // 去重
    const seen = new Set<number>();
    const uniqueRoots: any[] = [];
    for (const r of roots) {
        if (!seen.has(r.uniqueId)) {
            seen.add(r.uniqueId);
            uniqueRoots.push(r);
        }
    }

    for (let i = 0; i < uniqueRoots.length; i++) {
        walk(uniqueRoots[i], "    ", i === uniqueRoots.length - 1);
    }

    console.log(lines.join("\n"));
}

// 挂到 window 方便控制台调用
if (typeof window !== "undefined") {
    (window as any).printNodeTree = printNodeTree;
}
