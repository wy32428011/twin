import { Component, ReactNode } from "react";

import { IoAddSharp, IoCloseOutline } from "react-icons/io5";

import { Node } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { showAlert, showPrompt } from "../../../../ui/dialog";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

export interface ICustomMetadataInspectorProps {
	object: Node;
}

/**
 * Custom metadata inspector component that allows users to add/edit/remove key-value pairs
 * for custom metadata on nodes.
 */
export class CustomMetadataInspector extends Component<ICustomMetadataInspectorProps> {
	public render(): ReactNode {
		const keys = Object.keys(this.props.object.metadata?.customMetadata ?? {});

		return (
			<EditorInspectorSectionField title="Metadata">
				{!keys.length && <div className="text-center text-white/50 py-2">未找到元数据。点击"添加"创建新的键值对。</div>}

				{keys.map((key, index) => (
					<div key={index} className="flex items-center">
						<div className="w-full">
							<EditorInspectorStringField label={key} object={this.props.object.metadata?.customMetadata ?? {}} property={key} onChange={() => this.forceUpdate()} />
						</div>

						<Button variant="ghost" className="p-2" onClick={() => this._handleRemoveKey(key)}>
							<IoCloseOutline className="w-4 h-4" />
						</Button>
					</div>
				))}

				<Button variant="secondary" className="flex items-center gap-2 w-full" onClick={() => this._handleAddKey()}>
					<IoAddSharp className="w-6 h-6" /> 添加
				</Button>
			</EditorInspectorSectionField>
		);
	}

	private async _handleAddKey(): Promise<unknown> {
		const key = await showPrompt("添加自定义元数据", "输入新元数据的键名：");

		if (!key) {
			return;
		}

		// Validate key name
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
			return showAlert("无效的键名", "键必须以字母或下划线开头，只能包含字母、数字和下划线。");
		}

		// Ensure metadata exists
		this.props.object.metadata ??= {};
		this.props.object.metadata.customMetadata ??= {};

		// Check if key already exists
		if (key in this.props.object.metadata.customMetadata) {
			return showAlert("重复的键", `键 "${key}" 已存在。`);
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => delete this.props.object.metadata.customMetadata[key],
			redo: () => (this.props.object.metadata.customMetadata[key] = ""),
		});

		this.forceUpdate();
	}

	private _handleRemoveKey(key: string): void {
		if (!this.props.object.metadata?.customMetadata) {
			return;
		}

		const oldValue = this.props.object.metadata.customMetadata[key];

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				this.props.object.metadata.customMetadata ??= {};
				this.props.object.metadata.customMetadata[key] = oldValue;
			},
			redo: () => {
				delete this.props.object.metadata.customMetadata[key];
				if (Object.keys(this.props.object.metadata.customMetadata).length === 0) {
					delete this.props.object.metadata.customMetadata;
				}
			},
		});

		this.forceUpdate();
	}
}
