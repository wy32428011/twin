import { IEditorMqttTwinMapping } from "./types";

interface IColorLike {
	r: number;
	g: number;
	b: number;
	set?: (r: number, g: number, b: number) => void;
}

const materialColorProperties = new Set(["diffuseColor", "emissiveColor", "specularColor", "ambientColor", "albedoColor", "reflectionColor"]);

export function isMqttMaterialColorProperty(property: string): boolean {
	return materialColorProperties.has(property);
}

interface IVisualNodeLike {
	visibility?: number;
	isVisible?: boolean;
	material?: Record<string, unknown>;
	setEnabled?: (enabled: boolean) => void;
}

function getBooleanValue(value: unknown): boolean | null {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "number") {
		return value !== 0;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().toLowerCase();
		if (["true", "1", "on", "yes"].includes(normalizedValue)) {
			return true;
		}

		if (["false", "0", "off", "no"].includes(normalizedValue)) {
			return false;
		}
	}

	return null;
}

function getNumberValue(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const numericValue = Number(value);
		return Number.isNaN(numericValue) ? null : numericValue;
	}

	return null;
}

function getColorValue(value: unknown): IColorLike | null {
	if (Array.isArray(value) && value.length >= 3) {
		const r = getNumberValue(value[0]);
		const g = getNumberValue(value[1]);
		const b = getNumberValue(value[2]);
		return r === null || g === null || b === null ? null : { r, g, b };
	}

	if (typeof value === "object" && value !== null) {
		const record = value as Record<string, unknown>;
		const r = getNumberValue(record.r);
		const g = getNumberValue(record.g);
		const b = getNumberValue(record.b);
		return r === null || g === null || b === null ? null : { r, g, b };
	}

	return null;
}

function setColorValue(material: Record<string, unknown>, property: string, color: IColorLike): boolean {
	if (!isMqttMaterialColorProperty(property)) {
		return false;
	}

	const currentColor = material[property] as IColorLike | undefined;
	if (!currentColor) {
		return false;
	}

	if (typeof currentColor.set === "function") {
		currentColor.set(color.r, color.g, color.b);
		return true;
	}

	if (typeof currentColor.r === "number" && typeof currentColor.g === "number" && typeof currentColor.b === "number") {
		currentColor.r = color.r;
		currentColor.g = color.g;
		currentColor.b = color.b;
		return true;
	}

	return false;
}

export function applyMqttVisualValue(node: IVisualNodeLike, mapping: IEditorMqttTwinMapping, value: unknown): boolean {
	switch (mapping.target) {
		case "visibility": {
			const visibility = getNumberValue(value);
			if (visibility === null) {
				return false;
			}

			node.visibility = visibility;
			return true;
		}
		case "enabled": {
			const enabled = getBooleanValue(value);
			if (enabled === null) {
				return false;
			}

			if (node.setEnabled) {
				node.setEnabled(enabled);
			} else {
				node.isVisible = enabled;
			}

			return true;
		}
		case "materialColor": {
			const material = node.material;
			const colorProperty = mapping.targetName ?? "diffuseColor";
			const color = getColorValue(value);
			if (!material || !color) {
				return false;
			}

			return setColorValue(material, colorProperty, color);
		}
		default:
			return false;
	}
}
