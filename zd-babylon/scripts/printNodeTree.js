// 直接粘贴到浏览器控制台使用，无需任何修改
// 用法: printNodeTree(scene)

(function() {
    const _classIcon = {
        Mesh: "⬡",
        GroundMesh: "▦",
        AbstractMesh: "◇",
        TransformNode: "○",
        Light: "☀",
        Camera: "◎",
    };

    function icon(node) {
        return _classIcon[node.getClassName?.()] ?? "·";
    }

    function brief(node) {
        const name = node.name || "(unnamed)";
        const cls = node.getClassName?.() || "Node";
        const enabled = node.isEnabled?.() === false ? " ⛔" : "";
        if (node.metadata?.clonedFrom) {
            return `${icon(node)} ${name} [${cls}] → clone of ${node.metadata.clonedFrom}${enabled}`;
        }
        if (node.metadata?.cloneForEditor) {
            return `${icon(node)} ${name} [${cls}] (editor clone)${enabled}`;
        }
        return `${icon(node)} ${name} [${cls}]${enabled}`;
    }

    function printNodeTree(scene) {
        const lines = [];

        function walk(node, prefix, isLast) {
            const connector = isLast ? "└─ " : "├─ ";
            lines.push(prefix + connector + brief(node));

            const children = node.getChildren?.() ?? [];
            const newPrefix = prefix + (isLast ? "    " : "│   ");

            for (let i = 0; i < children.length; i++) {
                walk(children[i], newPrefix, i === children.length - 1);
            }
        }

        lines.push((scene).name || "Scene");
        const roots = [
            ...scene.rootNodes,
            ...scene.meshes.filter(function(m) { return !m.parent; }),
            ...scene.lights.filter(function(l) { return !l.parent; }),
            ...scene.cameras.filter(function(c) { return !c.parent; }),
        ];
        // 去重
        const seen = new Set();
        const uniqueRoots = [];
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

    window.printNodeTree = printNodeTree;
})();
