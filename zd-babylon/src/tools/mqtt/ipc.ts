import { IClientOptions, ISubscriptionMap } from "mqtt";

import { IEditorProjectMqttConfiguration, IEditorProjectMqttTopicConfiguration } from "./types";

const supportedProtocols = ["mqtt:", "mqtts:", "ws:", "wss:"];
const defaultMaxTopicCount = 100;
const defaultMaxTopicLength = 256;
const defaultMaxPayloadBytes = 64 * 1024;

export function validateMqttConnectionUrl(url: string): URL {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		throw new Error("Invalid MQTT broker URL.");
	}

	if (!supportedProtocols.includes(parsedUrl.protocol)) {
		throw new Error(`Unsupported MQTT protocol: ${parsedUrl.protocol}`);
	}

	if (parsedUrl.username || parsedUrl.password) {
		throw new Error("Broker URL must not include credentials. Use username and runtime password fields instead.");
	}

	return parsedUrl;
}

export function validateMqttTopics(topics: string[], options?: { allowWildcards?: boolean; maxCount?: number; maxLength?: number }): string[] {
	const maxCount = options?.maxCount ?? defaultMaxTopicCount;
	const maxLength = options?.maxLength ?? defaultMaxTopicLength;
	const allowWildcards = options?.allowWildcards ?? false;
	const normalizedTopics = [...new Set(topics.map((topic) => topic.trim()).filter(Boolean))];

	if (normalizedTopics.length > maxCount) {
		throw new Error(`Too many MQTT topics. Maximum is ${maxCount}.`);
	}

	for (const topic of normalizedTopics) {
		if (topic.length > maxLength) {
			throw new Error(`MQTT topic is too long. Maximum is ${maxLength} characters.`);
		}

		if (!allowWildcards && (topic.includes("#") || topic.includes("+"))) {
			throw new Error("MQTT wildcards are not supported for digital twin mappings.");
		}
	}

	return normalizedTopics;
}

export function validateMqttPayload(payload: Buffer, maxBytes = defaultMaxPayloadBytes): Buffer {
	if (payload.byteLength > maxBytes) {
		throw new Error(`MQTT payload is too large. Maximum is ${maxBytes} bytes.`);
	}

	return payload;
}

export function createMqttClientOptions(configuration: IEditorProjectMqttConfiguration): IClientOptions {
	return {
		clientId: configuration.clientId,
		username: configuration.username,
		password: configuration.password,
		reconnectPeriod: configuration.reconnectPeriod ?? 1000,
		connectTimeout: configuration.connectTimeout ?? 30000,
		resubscribe: true,
	};
}

export function createMqttSubscriptionMap(topics: IEditorProjectMqttTopicConfiguration[]): ISubscriptionMap {
	const normalizedTopics = validateMqttTopics(topics.map((topic) => topic.topic));
	return normalizedTopics.reduce<ISubscriptionMap>((subscriptions, topic) => {
		const topicConfiguration = topics.find((topicConfiguration) => topicConfiguration.topic.trim() === topic);
		subscriptions[topic] = { qos: topicConfiguration?.qos ?? 0 };
		return subscriptions;
	}, {});
}
