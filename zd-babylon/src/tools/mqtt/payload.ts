export function parseMqttPayload(payload: string): unknown {
	const trimmed = payload.trim();
	if (trimmed.length === 0) {
		return "";
	}

	try {
		return JSON.parse(trimmed);
	} catch {
		const numericValue = Number(trimmed);
		if (!Number.isNaN(numericValue)) {
			return numericValue;
		}

		return payload;
	}
}

export function getPayloadValue(payload: unknown, payloadPath?: string): unknown {
	if (!payloadPath) {
		return payload;
	}

	return payloadPath.split(".").reduce<unknown>((current, segment) => {
		if (current === null || current === undefined) {
			return undefined;
		}

		if (Array.isArray(current)) {
			const index = Number(segment);
			return Number.isInteger(index) ? current[index] : undefined;
		}

		if (typeof current === "object" && segment in current) {
			return (current as Record<string, unknown>)[segment];
		}

		return undefined;
	}, payload);
}
