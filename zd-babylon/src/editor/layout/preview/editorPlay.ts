import { join as nativeJoin } from "path";
import { basename, join } from "path/posix";

import { Node, Mesh, AbstractMesh, Vector3, Quaternion } from "babylonjs";

import { ensureTemporaryDirectoryExists } from "../../../tools/project";
import { isMesh } from "../../../tools/guards/nodes";
import { compilePlayScript } from "../../../tools/scene/play/compile";
import { projectConfiguration } from "../../../project/configuration";

import { Editor } from "../../main";

interface ITransformSnapshot {
    position: Vector3;
    rotation: Vector3;
    scaling: Vector3;
    rotationQuaternion: Quaternion | null;
}

export class EditorPlay {
    private _temporaryDirectory: string | null = null;
    private _compiledScriptExports: any = null;
    private _initialized: boolean = false;
    private _originalSnapshots = new Map<string, ITransformSnapshot>();
    private _cloneSnapshots = new Map<string, ITransformSnapshot>();

    constructor(private _editor: Editor) {}

    public async init(): Promise<void> {
        if (this._initialized) {
            return;
        }
        this._initialized = true;

        this._temporaryDirectory ??= await ensureTemporaryDirectoryExists(projectConfiguration.path!);

        await this.hotReloadScriptForNotPlaying("", true);

        // 每帧同步克隆体和原始模型的 transform
        this._editor.layout.preview.scene.onBeforeRenderObservable.add(() => {
            this._syncClonesToOriginals();
        });
    }

    private _getSnapshot(mesh: AbstractMesh): ITransformSnapshot {
        return {
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone(),
            scaling: mesh.scaling.clone(),
            rotationQuaternion: mesh.rotationQuaternion?.clone() ?? null,
        };
    }

    private _snapshotChanged(current: ITransformSnapshot, previous: ITransformSnapshot | undefined): boolean {
        if (!previous) {
            return false;
        }
        return !current.position.equalsWithEpsilon(previous.position) ||
            !current.rotation.equalsWithEpsilon(previous.rotation) ||
            !current.scaling.equalsWithEpsilon(previous.scaling) ||
            !this._quaternionEqual(current.rotationQuaternion, previous.rotationQuaternion);
    }

    private _quaternionEqual(a: Quaternion | null, b: Quaternion | null): boolean {
        if (a === null && b === null) {
            return true;
        }
        if (a === null || b === null) {
            return false;
        }
        return Math.abs(a.x - b.x) < 0.0001 &&
            Math.abs(a.y - b.y) < 0.0001 &&
            Math.abs(a.z - b.z) < 0.0001 &&
            Math.abs(a.w - b.w) < 0.0001;
    }

    private _applyTransform(target: AbstractMesh, source: AbstractMesh): void {
        target.position.copyFrom(source.position);
        target.rotation.copyFrom(source.rotation);
        target.scaling.copyFrom(source.scaling);
        if (source.rotationQuaternion) {
            target.rotationQuaternion = source.rotationQuaternion.clone();
        } else {
            target.rotationQuaternion = null;
        }
    }

    private _syncClonesToOriginals(): void {
        const scene = this._editor.layout.preview.scene;

        for (const mesh of scene.meshes) {
            if (!mesh.metadata?.clonedFrom || mesh.isDisposed()) {
                continue;
            }
            const original = scene.getMeshById(mesh.metadata.clonedFrom);
            if (!original || original.isDisposed()) {
                continue;
            }

            const originalCurrent = this._getSnapshot(original);
            const cloneCurrent = this._getSnapshot(mesh);

            const originalChanged = this._snapshotChanged(originalCurrent, this._originalSnapshots.get(original.id));
            const cloneChanged = this._snapshotChanged(cloneCurrent, this._cloneSnapshots.get(mesh.id));

            if (originalChanged && !cloneChanged) {
                // 原始模型被修改（inspector 编辑），同步到克隆体
                this._applyTransform(mesh, original);
            } else if (cloneChanged && !originalChanged) {
                // 克隆体被修改（gizmo 拖拽或脚本运行），同步到原始模型
                this._applyTransform(original, mesh);
            }
            // 两者都未变：无操作；两者都变：以原始模型为准（已在上面处理），这里不做任何操作避免抖动

            this._originalSnapshots.set(original.id, originalCurrent);
            this._cloneSnapshots.set(mesh.id, cloneCurrent);
        }
    }

    private async _compileScripts(): Promise<boolean> {
        const log = await this._editor.layout.console.progress("Compiling scripts...");

        try {
            await compilePlayScript(this._temporaryDirectory!, {
                onTransformSource: (path) =>
                    log.setState({
                        message: `Compiling source: ${basename(path)}`,
                    }),
            });

            log.setState({
                done: true,
                message: "Scripts compiled",
            });

            return true;
        } catch (e) {
            if (e instanceof Error) {
                this._editor.layout.console.error(`Failed to compile play scripts:\n${e.message}`);
            }

            log.setState({
                error: true,
                message: "Failed to compile scripts",
            });

            return false;
        }
    }

    private _requireCompiledScripts(): void {
        const scriptPath = join(this._temporaryDirectory!, "play/script.cjs");
        this._compiledScriptExports = require(scriptPath);
        delete require.cache[nativeJoin(scriptPath)];
    }

    public async hotReloadScriptForNotPlaying(_scriptKey: string, compile: boolean, targetMesh?: AbstractMesh): Promise<void> {
        const scene = this._editor.layout.preview.scene;

        if (compile) {
            await this._compileScripts();
            this._requireCompiledScripts();
        }

        // const selectedNode = this._editor.layout.graph.getSelectedNodes()[0]?.nodeData as Mesh;
        const targetMeshes = targetMesh && isMesh(targetMesh) && !targetMesh.parent
            ? [targetMesh]
            : scene.meshes.filter(n => isMesh(n) && !n.parent);

        for (const mesh of targetMeshes) {
            await this._refreshMeshScripts(mesh as Mesh);
        }
    }

    /**
     * 销毁指定 mesh 关联的编辑器克隆体，并清理脚本实例。
     */
    public disposeCloneMesh(mesh: { metadata?: any }): void {
        const scene = this._editor.layout.preview.scene;
        if (!mesh.metadata?.cloneForEditor) {
            return;
        }
        const clone = scene.getMeshById(mesh.metadata.cloneForEditor);
        if (clone && !clone.isDisposed()) {
            const instances = clone.metadata?._scriptInstances as any[] | undefined;
            if (instances) {
                instances.forEach((instance: any) => instance?.onStop?.());
            }
            clone.dispose();
        }
        mesh.metadata.cloneForEditor = undefined;
    }

    private async _refreshMeshScripts(mesh: Mesh): Promise<void> {
        const scriptsMap = this._compiledScriptExports?.scriptsMap ?? {};

        // 1. 销毁旧克隆体
        this.disposeCloneMesh(mesh);

        // 2. 恢复原始 mesh 可见性
        mesh.setEnabled(true);

        const enabledScripts = mesh.metadata?.scripts?.filter((s: any) => s.enabled) ?? [];
        if (enabledScripts.length === 0) {
            return;
        }

        // 3. 重新克隆 mesh，脚本将作用于克隆体
        const clonedMesh = this._cloneWithOriginalNames(mesh) as Mesh;

        // 4. 为克隆体创建所有脚本实例并执行 onStart
        const instances: any[] = [];
        for (const script of enabledScripts) {
            const exports = scriptsMap[script.key];
            if (!exports?.default) {
                continue;
            }

            const newInstance = new exports.default(clonedMesh);

            const ctor = newInstance.constructor;
            (ctor._VisibleInInspector ?? []).forEach((params: any) => {
                const propertyKey = params.propertyKey.toString();
                const attachedValues = script.values;

                if (!attachedValues) {
                    console.warn(`No values found for script with key "${script.key}".`);
                    return;
                }

                if (attachedValues.hasOwnProperty(propertyKey) && attachedValues[propertyKey].hasOwnProperty("value")) {
                    const value = attachedValues[propertyKey].value;

                    switch (params.configuration.type) {
                        case "number":
                        case "boolean":
                        case "keymap":
                        case "string":
                            newInstance[propertyKey] = value;
                            break;
                    }
                }
            });

            newInstance?.onStart?.();
            instances.push(newInstance);
        }
        clonedMesh.metadata._scriptInstances = instances;
    }

    private _cloneWithOriginalNames(
        original: Mesh,
        newName?: string | null,
        onCloned?: (original: Node, clone: Node) => void
    ): Node {
        const scene = this._editor.layout.preview.scene;
        const clonedId = original.metadata.cloneForEditor;
        const cloned = scene.getMeshById(clonedId);
        if (cloned) {
            return cloned;
        }
        original.metadata.cloneForEditor = undefined;

        const clonedRoot = original.clone(newName ?? original.name);
        original.setEnabled(false);
        clonedRoot.setEnabled(true);
        clonedRoot.metadata = JSON.parse(JSON.stringify(original.metadata));
        clonedRoot.metadata.clonedFrom = original.id;
        original.metadata.cloneForEditor = clonedRoot.id;

        function restoreNames(orig: Node, clone: Node): void {
            if (orig !== original || newName == null) {
                clone.name = orig.name;
            }

            if (onCloned) {
                onCloned(orig, clone);
            }

            for (let i = 0; i < orig.getChildren().length; i++) {
                const origChild = orig.getChildren()[i];
                const cloneChild = clone.getChildren()[i];
                if (cloneChild) {
                    restoreNames(origChild, cloneChild);
                }
            }
        }

        restoreNames(original, clonedRoot);
        return clonedRoot;
    }

    public beforePlaying(): void {
        this._editor.layout.preview.scene.meshes.forEach(m => {
            if (!m.metadata) return;
            if (m.metadata.clonedFrom) {
                m.setEnabled(false);
            }
            if (m.metadata.cloneForEditor) {
                m.setEnabled(true);
            }
        });

        this._editor.layout.preview.scene.activeCamera?.detachControl();
    }

    public afterPlaying(): void {
        this._editor.layout.preview.scene.meshes.forEach(m => {
            if (!m.metadata) return;
            if (m.metadata.clonedFrom) {
                m.setEnabled(true);
            }
            if (m.metadata.cloneForEditor) {
                m.setEnabled(false);
            }
        });

        this._editor.layout.preview.scene.activeCamera?.attachControl(true);
    }
}
