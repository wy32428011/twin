import { showConfirm } from "../../../ui/dialog";

import { isAbstractMesh } from "../../../tools/guards/nodes";
// import { registerSimpleUndoRedo } from "../../../tools/undoredo";
import { Editor } from "../../main";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";
import { Input } from "../../../ui/shadcn/ui/input";
import { Mesh, Node } from "babylonjs";
import { onNodesAddedObservable } from "../../../tools/observables";



export function cloneByEditor(_editor: Editor, object: Mesh) {

  if (!isAbstractMesh(object)) {
    return;
  }

  const scene = _editor.layout.preview.scene;

  // 找到模型根节点：沿父链向上，若祖先带有 clonedFrom 则以该克隆根节点的原始模型为源；
  // 否则取最顶层非 scene 父节点作为源，确保阵列复制整个模型而非局部子 mesh
  let sourceObject = object;
  {
    let node: any = object;
    let cloneRoot: any = null;
    let modelRoot: any = node;
    while (node) {
      if (node.metadata?.clonedFrom) {
        cloneRoot = node;
        // 找到 temp clone 根就停，不再往上
        break;
      }
      modelRoot = node;
      const parent = node.parent;
      if (!parent || parent === scene) break;
      node = parent;
    }
    if (cloneRoot) {
      const original = scene.getMeshById(cloneRoot.metadata.clonedFrom);
      if (original) {
        sourceObject = original as Mesh;
      }
    } else {
      sourceObject = modelRoot as Mesh;
    }
  }

  let direction = "+x";
  let gap = 100;
  let count = 1;

  const dialog = showConfirm(
    "阵列",
    <div className="flex flex-col gap-4 py-5">

      <div className="flex flex-row items-center gap-4">
        <div>方向</div>
        <div className="flex gap-[10px]">
          <Select defaultValue={direction} onValueChange={(v) => { direction = v }}>
            <SelectTrigger className="w-36 border-none bg-muted/50">
              <SelectValue placeholder="Select Value..." />
            </SelectTrigger>
            <SelectContent>
              {['+x', '-x', '+y', '-y', '+z', '-z'].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-row items-center gap-4">
        <div>间距</div>
        <div className="flex gap-[10px]">
          <Input defaultValue={gap} placeholder="间距..." onChange={(e) => gap = parseInt(e.currentTarget.value)} />
        </div>
      </div>

      <div className="flex flex-row items-center gap-4">
        <div>数量</div>
        <div className="flex gap-[10px]">
          <Input defaultValue={count} placeholder="数量..." onChange={(e) => count = parseInt(e.currentTarget.value)} />
        </div>
      </div>
    </div>,
    {
      confirmText: '生成',
      cancelText: '取消',
    }
  );

  dialog.then((result) => {
    if (!result) return;

    // 扫描 scene 一级节点，做增量命名，避免跨会话重复
    const prefix = sourceObject.name + '_';
    const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$');
    let maxN = 0;
    for (const n of scene.rootNodes) {
      const m = n.name.match(re);
      if (m) {
        maxN = Math.max(maxN, parseInt(m[1], 10));
      }
    }

    const isCreateInstance = sourceObject.metadata?.cloneType === 'instance';
    const getValue = (d: string, v: number, check: boolean) => {
      return check ? (d === '+' ? v : -v) : 0;
    }
    const cleanMetadata = (m: any) => {
      if (!m) return;
      delete m.clonedFrom;
      delete m.cloneForEditor;
      delete m.cloneType;
      delete m.scripts?.[0]?._id;
    };

    const cloneFunc = (node: Mesh) => {
      const _result: any[] = [];

      const restoreNames = (orig: Node, clone: Node, newRootName: string) => {
        // 根节点用新名称，其余子节点恢复原名
        if (orig === node) {
          clone.name = newRootName;
        } else {
          clone.name = orig.name;
        }

        clone.metadata = JSON.parse(JSON.stringify(orig.metadata));
        cleanMetadata(clone.metadata);

        const origChildren = orig.getChildren();
        const cloneChildren = clone.getChildren();
        for (let j = 0; j < origChildren.length; j++) {
          const origChild = origChildren[j];
          const cloneChild = cloneChildren[j];
          if (cloneChild) {
            restoreNames(origChild, cloneChild, newRootName);
          }
        }
      };

      for (let i = 0; i < count; i++) {
        const newName = node.name + '_' + (maxN + i + 1);
        const newNode = isCreateInstance ? node.createInstance(newName) : node.clone(newName);

        newNode.setEnabled(true);

        const [d, r] = direction.split('');
        newNode.position.addInPlaceFromFloats(
          getValue(d, gap * (i + 1), r === 'x'),
          getValue(d, gap * (i + 1), r === 'y'),
          getValue(d, gap * (i + 1), r === 'z')
        );

        // clone() 会深拷贝子节点，需要递归恢复子节点 name 和清理 metadata
        // createInstance 没有子节点，restoreNames 只处理根节点本身
        restoreNames(node, newNode, newName);

        _result.push(newNode);
      }
      return _result;
    };
    cloneFunc(sourceObject);
    onNodesAddedObservable.notifyObservers();
  })

}
