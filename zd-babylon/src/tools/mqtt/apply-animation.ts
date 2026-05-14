import { IEditorMqttTwinMapping } from "./types";

interface IAnimationGroupLike {
	name: string;
	from: number;
	to: number;
	start?: (loop?: boolean) => void;
	stop?: () => void;
	goToFrame?: (frame: number) => void;
}

interface IAnimationSceneLike {
	animationGroups?: IAnimationGroupLike[];
	getAnimationGroupByName?: (name: string) => IAnimationGroupLike | null;
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
		if (["true", "1", "on", "yes", "start", "play"].includes(normalizedValue)) {
			return true;
		}

		if (["false", "0", "off", "no", "stop", "pause"].includes(normalizedValue)) {
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

function getAnimationGroup(scene: IAnimationSceneLike, name?: string): IAnimationGroupLike | null {
	if (!name) {
		return null;
	}

	return scene.getAnimationGroupByName?.(name) ?? scene.animationGroups?.find((animationGroup) => animationGroup.name === name) ?? null;
}

export function applyMqttAnimationValue(scene: IAnimationSceneLike, mapping: IEditorMqttTwinMapping, value: unknown): boolean {
	const animationGroup = getAnimationGroup(scene, mapping.targetName);
	if (!animationGroup) {
		return false;
	}

	if (mapping.valueType === "boolean") {
		const enabled = getBooleanValue(value);
		if (enabled === null) {
			return false;
		}

		if (enabled) {
			animationGroup.start?.(false);
		} else {
			animationGroup.stop?.();
		}

		return true;
	}

	const progress = getNumberValue(value);
	if (progress === null || !animationGroup.goToFrame) {
		return false;
	}

	const frame = animationGroup.from + (animationGroup.to - animationGroup.from) * progress;
	animationGroup.goToFrame(frame);
	return true;
}
