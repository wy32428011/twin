import { IEditorMqttTwinMapping } from "./types";

interface IVectorLike {
	x: number;
	y: number;
	z: number;
}

interface ITransformNodeLike {
	name?: string;
	rotation: IVectorLike;
}

interface IBoneLike {
	name: string;
	getTransformNode?: () => ITransformNodeLike | null;
}

interface ISkeletonLike {
	bones?: IBoneLike[];
}

interface ISkeletonSceneLike {
	skeletons?: ISkeletonLike[];
	getTransformNodeByName?: (name: string) => ITransformNodeLike | null;
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

function applyScaleAndOffset(value: number, mapping: IEditorMqttTwinMapping): number {
	return value * (mapping.scale ?? 1) + (mapping.offset ?? 0);
}

function toRadians(value: number, mapping: IEditorMqttTwinMapping): number {
	return mapping.valueType === "degrees" ? (value * Math.PI) / 180 : value;
}

function getVectorValue(value: unknown): IVectorLike | null {
	if (Array.isArray(value) && value.length >= 3) {
		const x = getNumberValue(value[0]);
		const y = getNumberValue(value[1]);
		const z = getNumberValue(value[2]);

		return x === null || y === null || z === null ? null : { x, y, z };
	}

	if (typeof value === "object" && value !== null) {
		const record = value as Record<string, unknown>;
		const x = getNumberValue(record.x);
		const y = getNumberValue(record.y);
		const z = getNumberValue(record.z);

		return x === null || y === null || z === null ? null : { x, y, z };
	}

	return null;
}

function getRotationTarget(scene: ISkeletonSceneLike, name?: string): ITransformNodeLike | null {
	if (!name) {
		return null;
	}

	const transformNode = scene.getTransformNodeByName?.(name);
	if (transformNode) {
		return transformNode;
	}

	for (const skeleton of scene.skeletons ?? []) {
		const bone = skeleton.bones?.find((bone) => bone.name === name);
		const boneTransformNode = bone?.getTransformNode?.();
		if (boneTransformNode) {
			return boneTransformNode;
		}
	}

	return null;
}

export function applyMqttSkeletonValue(scene: ISkeletonSceneLike, mapping: IEditorMqttTwinMapping, value: unknown): boolean {
	const target = getRotationTarget(scene, mapping.targetName);
	if (!target) {
		return false;
	}

	if (mapping.axis === "all" || mapping.valueType === "vector3") {
		const vectorValue = getVectorValue(value);
		if (!vectorValue) {
			return false;
		}

		target.rotation.x = toRadians(applyScaleAndOffset(vectorValue.x, mapping), mapping);
		target.rotation.y = toRadians(applyScaleAndOffset(vectorValue.y, mapping), mapping);
		target.rotation.z = toRadians(applyScaleAndOffset(vectorValue.z, mapping), mapping);
		return true;
	}

	if (!mapping.axis) {
		return false;
	}

	const numericValue = getNumberValue(value);
	if (numericValue === null) {
		return false;
	}

	target.rotation[mapping.axis] = toRadians(applyScaleAndOffset(numericValue, mapping), mapping);
	return true;
}
