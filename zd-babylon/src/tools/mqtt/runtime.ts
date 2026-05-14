import { applyMqttAnimationValue } from "./apply-animation";
import { applyMqttMappingValue } from "./apply-transform";
import { applyMqttSkeletonValue } from "./apply-skeleton";
import { applyMqttVisualValue, isMqttMaterialColorProperty } from "./apply-visual";
import { getPayloadValue, parseMqttPayload } from "./payload";
import { IEditorMqttMessage, IEditorMqttTwinMapping, IEditorMqttTwinMetadata, MqttTwinRuntimeMode } from "./types";

interface IObservableLike<T> {
	add(callback: (eventData: T) => void): unknown;
	remove(observer: unknown): void;
}

interface IMqttRuntimeNodeLike {
	metadata?: {
		mqttTwin?: IEditorMqttTwinMetadata;
	};
}

interface IMqttRuntimeSceneLike {
	getNodes?: () => IMqttRuntimeNodeLike[];
	onBeforeRenderObservable: IObservableLike<unknown>;
}

interface IEditorMqttTwinRuntimeOptions {
	scene: IMqttRuntimeSceneLike;
	mode?: MqttTwinRuntimeMode;
}

interface IMqttRuntimeBinding {
	node: IMqttRuntimeNodeLike;
	mapping: IEditorMqttTwinMapping;
	lastAppliedSequence?: number;
	restore?: () => void;
}

export class EditorMqttTwinRuntime {
	private _bindings: IMqttRuntimeBinding[] = [];
	private _latestMessages = new Map<string, IEditorMqttMessage>();
	private _renderObserver: unknown = null;
	private _messageListener: ((_: unknown, message: IEditorMqttMessage) => void) | null = null;
	private _ipcRenderer: typeof import("electron").ipcRenderer | null = null;

	public constructor(private readonly _options: IEditorMqttTwinRuntimeOptions) {
		try {
			this._ipcRenderer = require("electron").ipcRenderer;
		} catch {
			this._ipcRenderer = null;
		}
	}

	public start(): void {
		this.stop();
		this._bindings = this._collectBindings();
		this._renderObserver = this._options.scene.onBeforeRenderObservable.add(() => this.applyLatestValues());

		if (this._ipcRenderer) {
			this._messageListener = (_, message) => this.handleMessage(message);
			this._ipcRenderer.on("mqtt:message", this._messageListener);
			this._subscribeBindingTopics();
		}
	}

	public stop(): void {
		if (this._renderObserver) {
			this._options.scene.onBeforeRenderObservable.remove(this._renderObserver);
			this._renderObserver = null;
		}

		if (this._messageListener && this._ipcRenderer) {
			this._ipcRenderer.removeListener("mqtt:message", this._messageListener);
			this._messageListener = null;
		}

		this._restoreEditorPreviewValues();
		this._latestMessages.clear();
	}

	public handleMessage(message: IEditorMqttMessage): void {
		this._latestMessages.set(message.topic, message);
	}

	public applyLatestValues(): void {
		const parsedPayloads = new Map<string, unknown>();
		for (const binding of this._bindings) {
			const message = this._latestMessages.get(binding.mapping.topic);
			const sequence = message?.sequence ?? message?.receivedAt;
			if (!message || binding.lastAppliedSequence === sequence) {
				continue;
			}

			let payload = parsedPayloads.get(message.topic);
			if (!parsedPayloads.has(message.topic)) {
				payload = parseMqttPayload(message.payload);
				parsedPayloads.set(message.topic, payload);
			}

			const value = getPayloadValue(payload, binding.mapping.payloadPath);
			this._applyBinding(binding, value);
			binding.lastAppliedSequence = sequence;
		}
	}

	private _collectBindings(): IMqttRuntimeBinding[] {
		return (this._options.scene.getNodes?.() ?? []).flatMap((node) => {
			const metadata = node.metadata?.mqttTwin;
			if (!metadata?.enabled) {
				return [];
			}

			return metadata.mappings.map((mapping) => ({
				node,
				mapping,
				restore: this._options.mode === "editor" ? this._createRestoreSnapshot(node, mapping) : undefined,
			}));
		});
	}

	private _restoreEditorPreviewValues(): void {
		if (this._options.mode !== "editor") {
			return;
		}

		this._bindings.forEach((binding) => binding.restore?.());
	}

	private _createRestoreSnapshot(node: IMqttRuntimeNodeLike, mapping: IEditorMqttTwinMapping): (() => void) | undefined {
		switch (mapping.target) {
			case "position":
			case "rotation":
			case "scaling":
				return this._createVectorRestoreSnapshot(node, mapping.target);
			case "visibility":
				return this._createPropertyRestoreSnapshot(node, "visibility");
			case "enabled":
				return this._createEnabledRestoreSnapshot(node);
			case "materialColor":
				return this._createMaterialColorRestoreSnapshot(node, mapping.targetName ?? "diffuseColor");
			default:
				return undefined;
		}
	}

	private _createVectorRestoreSnapshot(node: IMqttRuntimeNodeLike, property: "position" | "rotation" | "scaling"): (() => void) | undefined {
		const vector = (node as any)[property];
		if (!vector) {
			return undefined;
		}

		const snapshot = { x: vector.x, y: vector.y, z: vector.z };
		return () => {
			vector.x = snapshot.x;
			vector.y = snapshot.y;
			vector.z = snapshot.z;
		};
	}

	private _createEnabledRestoreSnapshot(node: IMqttRuntimeNodeLike): (() => void) | undefined {
		const nodeAny = node as any;
		if (typeof nodeAny.setEnabled === "function" && typeof nodeAny.isEnabled === "function") {
			const enabled = nodeAny.isEnabled();
			return () => nodeAny.setEnabled(enabled);
		}

		return this._createPropertyRestoreSnapshot(node, "isVisible");
	}

	private _createPropertyRestoreSnapshot(node: IMqttRuntimeNodeLike, property: string): (() => void) | undefined {
		if (!(property in (node as any))) {
			return undefined;
		}

		const value = (node as any)[property];
		return () => {
			(node as any)[property] = value;
		};
	}

	private _createMaterialColorRestoreSnapshot(node: IMqttRuntimeNodeLike, property: string): (() => void) | undefined {
		if (!isMqttMaterialColorProperty(property)) {
			return undefined;
		}

		const color = (node as any).material?.[property];
		if (!color || typeof color.r !== "number" || typeof color.g !== "number" || typeof color.b !== "number") {
			return undefined;
		}

		const snapshot = { r: color.r, g: color.g, b: color.b };
		return () => {
			if (typeof color.set === "function") {
				color.set(snapshot.r, snapshot.g, snapshot.b);
			} else {
				color.r = snapshot.r;
				color.g = snapshot.g;
				color.b = snapshot.b;
			}
		};
	}

	private _subscribeBindingTopics(): void {
		const topics = [...new Set(this._bindings.map((binding) => binding.mapping.topic.trim()).filter(Boolean))];
		if (topics.length > 0) {
			this._ipcRenderer?.send("mqtt:subscribe", topics);
		}
	}

	private _applyBinding(binding: IMqttRuntimeBinding, value: unknown): boolean {
		switch (binding.mapping.target) {
			case "position":
			case "rotation":
			case "scaling":
				return applyMqttMappingValue(binding.node as any, binding.mapping, value);
			case "visibility":
			case "enabled":
			case "materialColor":
				return applyMqttVisualValue(binding.node as any, binding.mapping, value);
			case "animation":
				return applyMqttAnimationValue(this._options.scene as any, binding.mapping, value);
			case "boneRotation":
				return applyMqttSkeletonValue(this._options.scene as any, binding.mapping, value);
			default:
				return false;
		}
	}
}
