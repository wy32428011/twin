import { IEditorProjectMqttConfiguration } from "./types";

export function createDefaultMqttConfiguration(): IEditorProjectMqttConfiguration {
	return {
		enabled: false,
		url: "mqtt://localhost:1883",
		reconnectPeriod: 1000,
		connectTimeout: 30000,
		topics: [],
		enableEditorPreview: false,
	};
}

export function normalizeMqttConfiguration(configuration?: Partial<IEditorProjectMqttConfiguration>): IEditorProjectMqttConfiguration {
	const defaultConfiguration = createDefaultMqttConfiguration();
	return {
		...defaultConfiguration,
		...configuration,
		topics: configuration?.topics?.map((topic) => ({ ...topic })) ?? defaultConfiguration.topics,
	};
}

function removeUrlCredentials(url: string): string {
	try {
		const parsedUrl = new URL(url);
		parsedUrl.username = "";
		parsedUrl.password = "";
		return parsedUrl.toString();
	} catch {
		return url;
	}
}

export function sanitizeMqttConfigurationForSave(configuration: IEditorProjectMqttConfiguration): IEditorProjectMqttConfiguration {
	const { password: _password, ...configurationWithoutPassword } = configuration;
	return {
		...configurationWithoutPassword,
		url: removeUrlCredentials(configuration.url),
		topics: configuration.topics.map((topic) => ({ ...topic })),
	};
}
