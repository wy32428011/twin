import { Mesh } from "babylonjs";
import { isInstancedMesh, isMesh } from "../../../tools/guards/nodes";

/**
 * 从子 mesh 反向找到最顶层的根父节点（整个大 mesh）
 * @param {BABYLON.AbstractMesh} childMesh 子 mesh
 * @returns {BABYLON.AbstractMesh} 最顶层的根父 mesh（如果没有父节点则返回自身）
 */
export function getRootParentMesh(childMesh) {
    let currentMesh = childMesh;
    // 一直向上找父节点，直到没有父节点为止
    while (currentMesh.parent) {
        currentMesh = currentMesh.parent;
    }
    return currentMesh;
}

/**
 * 从子 mesh 获取其所属大 mesh 的所有组件（整个层级）
 * @param {BABYLON.AbstractMesh} childMesh 子 mesh
 * @returns {BABYLON.AbstractMesh[]} 整个大 mesh 的所有组件数组
 */
export function getAllMeshesFromChild(childMesh) {
    // 第一步：找到最顶层的根父节点（大 mesh）
    const rootMesh = getRootParentMesh(childMesh);
    // 第二步：遍历根节点的所有子级（包含自身）
    const allMeshes = rootMesh.geometry ? [rootMesh] : [];

    function traverseChildren(node) {
        node.getChildren().forEach(child => {
            if (isMesh(child) || isInstancedMesh(child)) {
                allMeshes.push(child);
            }
            traverseChildren(child); // 递归遍历嵌套子节点
        });
    }

    traverseChildren(rootMesh);
    return allMeshes;
}

/**
 * 从子 mesh 获取其所属大 mesh 的整体包围盒
 * @param {BABYLON.AbstractMesh} childMesh 子 mesh
 * @returns {BABYLON.BoundingBox} 整个大 mesh 的包围盒
 */
function getRootBoundingBoxFromChild(childMesh) {
    // 找到根父节点
    // const rootMesh = getRootParentMesh(childMesh);
    // 获取整个根节点的包围盒（包含所有子级）
    const allMeshes = getAllMeshesFromChild(childMesh);

    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

    allMeshes.forEach(mesh => {
        mesh.computeWorldMatrix(true); // 关键：更新世界矩阵
        const box = mesh.getBoundingInfo().boundingBox;
        min = BABYLON.Vector3.Minimize(min, box.minimum);
        max = BABYLON.Vector3.Maximize(max, box.maximum);
    });

    return new BABYLON.BoundingBox(min, max);
}

/**
 * 用 Box 网格创建绿色线框（更稳定）
 * @param {BABYLON.BoundingBox} boundingBox 目标包围盒
 * @param {BABYLON.Scene} scene 场景对象
 * @param {string} name 线框名称（可选）
 * @returns {BABYLON.Mesh} 线框 mesh
 */
function createStableBoundingBoxWireframe(boundingBox, scene, name = "stable-bbox-wireframe") {
    // 1. 计算 Box 的尺寸、位置
    const center = boundingBox.center; // 包围盒中心
    const size = boundingBox.maximum.subtract(boundingBox.minimum);

    // 2. 创建 Box 网格（设置为仅渲染边）
    const box = BABYLON.MeshBuilder.CreateBox(name, {
        size: 1, // 先设为 1，后续缩放
        sideOrientation: BABYLON.Mesh.DOUBLESIDE // 双面渲染
    }, scene);

    // 3. 缩放、定位 Box 匹配包围盒
    box.scaling = size; // 缩放到包围盒尺寸
    box.position = center; // 定位到包围盒中心

    // 4. 创建线框材质（绿色）
    const wireframeMaterial = new BABYLON.StandardMaterial(`${name}-material`, scene);
    wireframeMaterial.wireframe = true; // 启用线框模式
    wireframeMaterial.emissiveColor = BABYLON.Color3.Green(); // 自发光绿色（避免受光照影响）
    wireframeMaterial.diffuseColor = BABYLON.Color3.Black(); // 漫反射黑色（不影响）
    wireframeMaterial.specularColor = BABYLON.Color3.Black(); // 高光黑色（不影响）

    // 5. 应用材质
    box.material = wireframeMaterial;

    // 可选：设置渲染层级，让线框始终在最前面
    box.renderingGroupId = 1; // 主场景物体默认是 0，线框设为 1 会优先渲染

    return box;
}

export function getBox(childMesh: Mesh) {
    // 1. 获取包围盒
    const wholeBoundingBox = getRootBoundingBoxFromChild(childMesh);
    const scene = childMesh.getScene();

    // 2. 创建稳定的绿色线框
    return createStableBoundingBoxWireframe(wholeBoundingBox, scene);
}

// ===================== 使用示例 =====================
// 1. 获取包围盒
// const childMesh = scene.getMeshByName("your-child-mesh");
// const wholeBoundingBox = getRootBoundingBoxFromChild(childMesh);

// 2. 创建稳定的绿色线框
// const stableWireframe = createStableBoundingBoxWireframe(wholeBoundingBox, scene);
