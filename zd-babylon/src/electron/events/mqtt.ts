import { BrowserWindow, ipcMain } from "electron";
import { connect, MqttClient } from "mqtt";

import { createMqttClientOptions, createMqttSubscriptionMap, validateMqttConnectionUrl, validateMqttPayload, validateMqttTopics } from "../../tools/mqtt/ipc";
import { IEditorProjectMqttConfiguration } from "../../tools/mqtt/types";

const clients = new Map<number, MqttClient>();
const windowsWithCleanup = new Set<number>();
let messageSequence = 0;

function sendToWindow(senderId: number, channel: string, data?: unknown): void {
	const window = BrowserWindow.getAllWindows().find((window) => window.webContents.id === senderId);
	window?.webContents.send(channel, data);
}

function disconnectClient(senderId: number): void {
	const client = clients.get(senderId);
	if (!client) {
		return;
	}

	clients.delete(senderId);
	client.end(true);
}

function isCurrentClient(senderId: number, client: MqttClient): boolean {
	return clients.get(senderId) === client;
}

function forgetClient(senderId: number, client: MqttClient): void {
	if (isCurrentClient(senderId, client)) {
		clients.delete(senderId);
	}
}

function subscribeClient(senderId: number, client: MqttClient, topics: string[]): void {
	let subscriptions: ReturnType<typeof createMqttSubscriptionMap>;
	try {
		subscriptions = createMqttSubscriptionMap(validateMqttTopics(topics).map((topic) => ({ topic })));
	} catch (error) {
		sendToWindow(senderId, "mqtt:error", error instanceof Error ? error.message : String(error));
		return;
	}

	if (Object.keys(subscriptions).length === 0) {
		return;
	}

	client.subscribe(subscriptions, (error) => {
		if (error && isCurrentClient(senderId, client)) {
			sendToWindow(senderId, "mqtt:error", error.message);
		}
	});
}

function registerWindowCleanup(senderId: number): void {
	if (windowsWithCleanup.has(senderId)) {
		return;
	}

	const window = BrowserWindow.getAllWindows().find((window) => window.webContents.id === senderId);
	if (!window) {
		return;
	}

	windowsWithCleanup.add(senderId);
	window.once("closed", () => {
		windowsWithCleanup.delete(senderId);
		disconnectClient(senderId);
	});
}

ipcMain.on("mqtt:connect", (ev, configuration: IEditorProjectMqttConfiguration) => {
	registerWindowCleanup(ev.sender.id);
	disconnectClient(ev.sender.id);

	if (!configuration.enabled) {
		sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "disabled" });
		return;
	}

	let client: MqttClient;
	try {
		validateMqttConnectionUrl(configuration.url);
		client = connect(configuration.url, createMqttClientOptions(configuration));
	} catch (error) {
		sendToWindow(ev.sender.id, "mqtt:error", error instanceof Error ? error.message : String(error));
		sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "error" });
		return;
	}

	clients.set(ev.sender.id, client);

	client.on("connect", () => {
		if (!isCurrentClient(ev.sender.id, client)) {
			return;
		}

		sendToWindow(ev.sender.id, "mqtt:status", { connected: true, status: "connected" });
		subscribeClient(ev.sender.id, client, configuration.topics.map((topic) => topic.topic));
	});

	client.on("message", (topic, payload) => {
		if (!isCurrentClient(ev.sender.id, client)) {
			return;
		}

		try {
			payload = validateMqttPayload(payload);
		} catch (error) {
			sendToWindow(ev.sender.id, "mqtt:error", error instanceof Error ? error.message : String(error));
			return;
		}

		sendToWindow(ev.sender.id, "mqtt:message", {
			topic,
			payload: payload.toString("utf-8"),
			receivedAt: Date.now(),
			sequence: ++messageSequence,
		});
	});

	client.on("error", (error) => {
		if (isCurrentClient(ev.sender.id, client)) {
			sendToWindow(ev.sender.id, "mqtt:error", error.message);
		}
	});

	client.on("close", () => {
		if (isCurrentClient(ev.sender.id, client)) {
			sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "closed" });
		}
	});

	client.on("end", () => {
		if (isCurrentClient(ev.sender.id, client)) {
			forgetClient(ev.sender.id, client);
			sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "ended" });
		}
	});

	client.on("offline", () => {
		if (isCurrentClient(ev.sender.id, client)) {
			sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "offline" });
		}
	});

	client.on("reconnect", () => {
		if (isCurrentClient(ev.sender.id, client)) {
			sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "reconnecting" });
		}
	});
});

ipcMain.on("mqtt:disconnect", (ev) => {
	disconnectClient(ev.sender.id);
	sendToWindow(ev.sender.id, "mqtt:status", { connected: false, status: "disconnected" });
});

ipcMain.on("mqtt:subscribe", (ev, topics: string[]) => {
	const client = clients.get(ev.sender.id);
	if (!client) {
		return;
	}

	subscribeClient(ev.sender.id, client, topics);
});

ipcMain.on("mqtt:publish", (ev, topic: string, payload: string) => {
	const client = clients.get(ev.sender.id);
	if (!client) {
		sendToWindow(ev.sender.id, "mqtt:error", "MQTT client is not connected.");
		return;
	}

	client.publish(topic, payload, (error) => {
		if (error && isCurrentClient(ev.sender.id, client)) {
			sendToWindow(ev.sender.id, "mqtt:error", error.message);
		}
	});
});
