import { writeJSON } from "fs-extra";
import { join, dirname } from "path/posix";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Material, AbstractMesh } from "babylonjs";

import { saveSingleFileDialog } from "../../../../../tools/dialog";
import { onRedoObservable, registerUndoRedo } from "../../../../../tools/undoredo";

import { showConfirm } from "../../../../../ui/dialog";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { projectConfiguration } from "../../../../../project/configuration";

export interface IEditorMaterialInspectorUtilsComponentProps {
	mesh?: AbstractMesh;
	material: Material;
}

export class EditorMaterialInspectorUtilsComponent extends Component<IEditorMaterialInspectorUtilsComponentProps> {
	public render(): ReactNode {
		return (
			<div className="flex gap-2 items-center w-full">
				<Button variant="secondary" className="w-full" onClick={() => this._handleExport()}>
					导出...
				</Button>

				{this.props.mesh && (
					<Button variant="secondary" className="w-full hover:bg-destructive" onClick={() => this._handleRemove()}>
						Remove
					</Button>
				)}
			</div>
		);
	}

	private async _handleRemove(): Promise<void> {
		const confirm = await showConfirm("移除材质", "确定要移除此材质吗？");
		if (!confirm) {
			return;
		}

		const mesh = this.props.mesh!;
		const material = this.props.material;

		registerUndoRedo({
			executeRedo: true,
			undo: () => (mesh.material = material),
			redo: () => (mesh.material = null),
		});

		onRedoObservable.notifyObservers();
	}

	private async _handleExport(): Promise<void> {
		const data = this.props.material.serialize();

		const destination = saveSingleFileDialog({
			title: "导出材质",
			filters: [{ name: "材质文件", extensions: ["material"] }],
			defaultPath: join(dirname(projectConfiguration.path!), "assets"),
		});

		if (!destination) {
			return;
		}

		await writeJSON(destination, data, { spaces: 4 });

		toast.success("材质导出成功！");
	}
}
