import { IEditorMqttTwinMapping } from "./types";

interface IVectorLike {
	x: number;
	y: number;
	z: number;
}

interface ITransformLike {
	position: IVectorLike;
	rotation: IVectorLike;
	scaling: IVectorLike;
}

function getNumericValue(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const numericValue = Number(value);
		return Number.isNaN(numericValue) ? null : numericValue;
	}

	return null;
}

function applyScaleAndOffset(value: number, mapping: IEditorMqttTwinMapping): number {
	return value * (mapping.scale ?? 1) + (mapping.offset ?? 0);
}

function toRadians(value: number, mapping: IEditorMqttTwinMapping): number {
	return mapping.valueType === "degrees" ? (value * Math.PI) / 180 : value;
}

function getVectorValue(value: unknown): IVectorLike | null {
	if (Array.isArray(value) && value.length >= 3) {
		const x = getNumericValue(value[0]);
		const y = getNumericValue(value[1]);
		const z = getNumericValue(value[2]);

		return x === null || y === null || z === null ? null : { x, y, z };
	}

	if (typeof value === "object" && value !== null) {
		const record = value as Record<string, unknown>;
		const x = getNumericValue(record.x);
		const y = getNumericValue(record.y);
		const z = getNumericValue(record.z);

		return x === null || y === null || z === null ? null : { x, y, z };
	}

	return null;
}

function getTargetVector(node: ITransformLike, target: IEditorMqttTwinMapping["target"]): IVectorLike | null {
	switch (target) {
		case "position":
			return node.position;
		case "rotation":
			return node.rotation;
		case "scaling":
			return node.scaling;
		default:
			return null;
	}
}

export function applyMqttMappingValue(node: ITransformLike, mapping: IEditorMqttTwinMapping, value: unknown): boolean {
	const targetVector = getTargetVector(node, mapping.target);
	if (!targetVector) {
		return false;
	}

	if (mapping.axis === "all" || mapping.valueType === "vector3") {
		const vectorValue = getVectorValue(value);
		if (!vectorValue) {
			return false;
		}

		targetVector.x = toRadians(applyScaleAndOffset(vectorValue.x, mapping), mapping);
		targetVector.y = toRadians(applyScaleAndOffset(vectorValue.y, mapping), mapping);
		targetVector.z = toRadians(applyScaleAndOffset(vectorValue.z, mapping), mapping);
		return true;
	}

	if (!mapping.axis) {
		return false;
	}

	const numericValue = getNumericValue(value);
	if (numericValue === null) {
		return false;
	}

	targetVector[mapping.axis] = toRadians(applyScaleAndOffset(numericValue, mapping), mapping);
	return true;
}
