import { Component, ReactNode } from "react";

import { Node } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Input } from "../../../../ui/shadcn/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";
import { Switch } from "../../../../ui/shadcn/ui/switch";

import { onNodeModifiedObservable } from "../../../../tools/observables";
import { IEditorMqttTwinMapping, IEditorMqttTwinMetadata, MqttTwinMappingAxis, MqttTwinMappingTarget, MqttTwinValueType } from "../../../../tools/mqtt/types";

import { EditorInspectorSectionField } from "../fields/section";
import { IEditorInspectorImplementationProps } from "../inspector";

const targetOptions: MqttTwinMappingTarget[] = ["position", "rotation", "scaling", "visibility", "enabled", "materialColor", "animation", "boneRotation"];
const axisOptions: MqttTwinMappingAxis[] = ["x", "y", "z", "all"];
const valueTypeOptions: MqttTwinValueType[] = ["number", "boolean", "string", "vector3", "color3", "degrees", "radians"];

export class EditorMqttInspector extends Component<IEditorInspectorImplementationProps<Node>> {
	public static IsSupported(object: unknown): boolean {
		return object instanceof Node;
	}

	public render(): ReactNode {
		const metadata = this._getMetadata();

		return (
			<EditorInspectorSectionField title="MQTT 数字孪生">
				<div className="flex items-center justify-between px-2 py-2">
					<div className="text-sm">启用映射</div>
					<Switch checked={metadata.enabled} onCheckedChange={(enabled) => this._updateMetadata({ ...metadata, enabled })} />
				</div>

				<div className="flex flex-col gap-3 px-2 py-2">
					{metadata.mappings.map((mapping, index) => this._renderMapping(mapping, index))}
					<Button variant="secondary" onClick={() => this._addMapping()}>添加 MQTT 映射</Button>
				</div>
			</EditorInspectorSectionField>
		);
	}

	private _renderMapping(mapping: IEditorMqttTwinMapping, index: number): ReactNode {
		return (
			<div key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">映射 {index + 1}</div>
					<Button variant="ghost" onClick={() => this._removeMapping(index)}>删除</Button>
				</div>
				{this._renderInput("Topic", mapping.topic, (topic) => this._updateMapping(index, { topic }))}
				{this._renderInput("Payload Path", mapping.payloadPath ?? "", (payloadPath) => this._updateMapping(index, { payloadPath: payloadPath || undefined }))}
				{this._renderSelect("Target", mapping.target, targetOptions, (target) => this._updateMapping(index, { target }))}
				{this._renderSelect("Axis", mapping.axis ?? "all", axisOptions, (axis) => this._updateMapping(index, { axis }))}
				{this._renderSelect("Value Type", mapping.valueType, valueTypeOptions, (valueType) => this._updateMapping(index, { valueType }))}
				{this._renderInput("Target Name", mapping.targetName ?? "", (targetName) => this._updateMapping(index, { targetName: targetName || undefined }))}
				{this._renderInput("Scale", String(mapping.scale ?? ""), (scale) => this._updateMapping(index, { scale: scale ? Number(scale) : undefined }), "number")}
				{this._renderInput("Offset", String(mapping.offset ?? ""), (offset) => this._updateMapping(index, { offset: offset ? Number(offset) : undefined }), "number")}
			</div>
		);
	}

	private _renderInput(label: string, value: string, onChange: (value: string) => void, type?: string): ReactNode {
		return (
			<div className="grid grid-cols-[110px_1fr] items-center gap-2">
				<div className="text-xs text-muted-foreground">{label}</div>
				<Input type={type ?? "text"} value={value} onChange={(ev) => onChange(ev.currentTarget.value)} />
			</div>
		);
	}

	private _renderSelect<T extends string>(label: string, value: T, options: T[], onChange: (value: T) => void): ReactNode {
		return (
			<div className="grid grid-cols-[110px_1fr] items-center gap-2">
				<div className="text-xs text-muted-foreground">{label}</div>
				<Select value={value} onValueChange={(value) => onChange(value as T)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>
		);
	}

	private _getMetadata(): IEditorMqttTwinMetadata {
		return this.props.object.metadata?.mqttTwin ?? { enabled: false, mappings: [] };
	}

	private _updateMetadata(metadata: IEditorMqttTwinMetadata): void {
		this.props.object.metadata ??= {};
		this.props.object.metadata.mqttTwin = metadata;
		onNodeModifiedObservable.notifyObservers(this.props.object);
		this.props.editor.layout.preview.startMqttTwinPreview();
		this.forceUpdate();
	}

	private _addMapping(): void {
		const metadata = this._getMetadata();
		this._updateMetadata({
			...metadata,
			mappings: [
				...metadata.mappings,
				{ topic: "", target: "position", axis: "x", valueType: "number" },
			],
		});
	}

	private _removeMapping(index: number): void {
		const metadata = this._getMetadata();
		this._updateMetadata({
			...metadata,
			mappings: metadata.mappings.filter((_, mappingIndex) => mappingIndex !== index),
		});
	}

	private _updateMapping(index: number, patch: Partial<IEditorMqttTwinMapping>): void {
		const metadata = this._getMetadata();
		this._updateMetadata({
			...metadata,
			mappings: metadata.mappings.map((mapping, mappingIndex) => mappingIndex === index ? { ...mapping, ...patch } : mapping),
		});
	}
}
