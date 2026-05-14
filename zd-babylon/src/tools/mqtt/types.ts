export type MqttTwinRuntimeMode = "editor" | "play";

export type MqttTwinMappingTarget = "position" | "rotation" | "scaling" | "visibility" | "enabled" | "materialColor" | "animation" | "boneRotation";

export type MqttTwinMappingAxis = "x" | "y" | "z" | "all";

export type MqttTwinValueType = "number" | "boolean" | "string" | "vector3" | "color3" | "degrees" | "radians";

export interface IEditorProjectMqttTopicConfiguration {
	topic: string;
	qos?: 0 | 1 | 2;
}

export interface IEditorProjectMqttConfiguration {
	enabled: boolean;
	url: string;
	clientId?: string;
	username?: string;
	password?: string;
	reconnectPeriod?: number;
	connectTimeout?: number;
	topics: IEditorProjectMqttTopicConfiguration[];
	enableEditorPreview?: boolean;
}

export interface IEditorMqttTwinMetadata {
	enabled: boolean;
	mappings: IEditorMqttTwinMapping[];
}

export interface IEditorMqttTwinMapping {
	topic: string;
	payloadPath?: string;
	target: MqttTwinMappingTarget;
	axis?: MqttTwinMappingAxis;
	valueType: MqttTwinValueType;
	targetName?: string;
	scale?: number;
	offset?: number;
}

export interface IEditorMqttMessage {
	topic: string;
	payload: string;
	receivedAt: number;
	sequence?: number;
}
