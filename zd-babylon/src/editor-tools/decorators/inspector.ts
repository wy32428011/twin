export type VisibleInspectorDecoratorAssetPossibleTypes = "json" | "material" | "nodeParticleSystemSet" | "scene" | "navmesh";

export type VisibleInInspectorDecoratorType = "number" | "boolean" | "string" | "vector2" | "vector3" | "color3" | "color4" | "entity" | "texture" | "keymap" | "asset";

export type VisibleInInspectorDecoratorConfiguration = {
	type: VisibleInInspectorDecoratorType;
	description?: string;
};

export type VisibleAsEntityType = "node" | "sound" | "animationGroup" | "particleSystem";

export type VisibleInInspectorDecoratorEntityConfiguration = VisibleInInspectorDecoratorConfiguration & {
	entityType?: VisibleAsEntityType;
};

export type VisibleInInspectorDecoratorStringConfiguration = VisibleInInspectorDecoratorConfiguration & {
	multiline?: boolean;
};

export type VisibleInspectorDecoratorAssetConfiguration<T = VisibleInspectorDecoratorAssetPossibleTypes> = VisibleInInspectorDecoratorConfiguration & {
	assetType: T;
	typeRestriction?: T extends "material" ? "PBRMaterial" | "StandardMaterial" | "AnyMaterial" : never;
};
