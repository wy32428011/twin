import { Divider } from "@blueprintjs/core";
import { Component, PropsWithChildren, ReactNode } from "react";

import { CascadedShadowGenerator, DirectionalLight, IShadowGenerator, IShadowLight, RenderTargetTexture, ShadowGenerator } from "babylonjs";

import { waitNextAnimationFrame } from "../../../../tools/tools";
import { getPowerOfTwoSizesUntil } from "../../../../tools/maths/scalar";
import { isDirectionalLight, isPointLight } from "../../../../tools/guards/nodes";
import { isCascadedShadowGenerator, isShadowGenerator } from "../../../../tools/guards/shadows";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../fields/list";

export interface IEditorLightShadowsInspectorProps extends PropsWithChildren {
	light: IShadowLight;
}

export interface IEditorLightShadowsInspectorState {
	generator: IShadowGenerator | null;
}

export type SoftShadowType =
	| "usePoissonSampling"
	| "useExponentialShadowMap"
	| "useCloseExponentialShadowMap"
	| "usePercentageCloserFiltering"
	| "useContactHardeningShadow"
	| "none";

export class EditorLightShadowsInspector extends Component<IEditorLightShadowsInspectorProps, IEditorLightShadowsInspectorState> {
	protected _generatorSize: number = 1024;
	protected _generatorType: string = "none";

	protected _softShadowType: SoftShadowType = "none";

	protected _sizes: IEditorInspectorListFieldItem[] = getPowerOfTwoSizesUntil(4096, 256).map(
		(s) =>
			({
				value: s,
				text: `${s}px`,
			}) as IEditorInspectorListFieldItem
	);

	public constructor(props: IEditorLightShadowsInspectorProps) {
		super(props);

		this.state = {
			generator: null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="阴影">
					{this._getEmptyShadowGeneratorComponent()}
					{this._getClassicShadowGeneratorComponent()}
					{this._getCascadedShadowGeneratorComponent()}
				</EditorInspectorSectionField>

				{this._getClassicSoftShadowComponent()}
			</>
		);
	}

	public componentDidMount(): void {
		this._refreshShadowGenerator();
	}

	private _refreshShadowGenerator(): void {
		const generator = this.props.light.getShadowGenerator();

		this._generatorType = !generator ? "none" : isCascadedShadowGenerator(generator) ? "cascaded" : "classic";

		this._softShadowType = this._getSoftShadowType(generator);
		this._generatorSize = generator?.getShadowMap()?.getSize().width ?? 1024;

		this.setState({ generator });
	}

	private _createShadowGenerator(type: "none" | "classic" | "cascaded"): void {
		const mapSize = this.state.generator?.getShadowMap()?.getSize();
		const renderList = this.state.generator?.getShadowMap()?.renderList?.slice(0);

		this.state.generator?.dispose();

		if (type === "none") {
			return this._refreshShadowGenerator();
		}

		if (!isDirectionalLight(this.props.light)) {
			type = "classic";
		}

		const generator =
			type === "classic"
				? new ShadowGenerator(mapSize?.width ?? 1024, this.props.light, true)
				: new CascadedShadowGenerator(mapSize?.width ?? 1024, this.props.light as DirectionalLight, true);

		if (isCascadedShadowGenerator(generator)) {
			generator.lambda = 1;
			generator.depthClamp = true;
			generator.autoCalcDepthBounds = true;
			generator.autoCalcDepthBoundsRefreshRate = 60;
		}

		if (!isPointLight(this.props.light)) {
			generator.usePercentageCloserFiltering = true;
			generator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
		}

		generator.transparencyShadow = true;
		generator.enableSoftTransparentShadow = true;

		if (renderList) {
			generator.getShadowMap()?.renderList?.push(...renderList);
		} else {
			generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
		}

		this._refreshShadowGenerator();
	}

	private _reszeShadowGenerator(size: number): void {
		const shadowMap = this.state.generator?.getShadowMap();
		if (shadowMap) {
			const refreshRate = shadowMap.refreshRate;
			shadowMap.resize(size);

			waitNextAnimationFrame().then(() => {
				updatePointLightShadowMapRenderListPredicate(this.props.light);

				const newShadowMap = this.state.generator?.getShadowMap();
				if (newShadowMap) {
					newShadowMap.refreshRate = refreshRate;
				}
			});
		}
	}

	private _getEmptyShadowGeneratorComponent(): ReactNode {
		if (this.state.generator) {
			return (
				<>
					<EditorInspectorListField
						object={this}
						property="_generatorType"
						label="生成器类型"
						onChange={(v) => this._createShadowGenerator(v)}
						items={[
							{ text: "无", value: "none" },
							{ text: "经典", value: "classic" },
							{ text: "级联", value: "cascaded" },
						]}
					/>
					<EditorInspectorListField object={this} property="_generatorSize" label="生成器大小" onChange={(v) => this._reszeShadowGenerator(v)} items={this._sizes} />
					<Divider />
				</>
			);
		}

		return (
			<EditorInspectorListField
				object={this}
				property="_generatorType"
				label="生成器类型"
				onChange={(v) => this._createShadowGenerator(v)}
				items={[
					{ text: "无", value: "none" },
					{ text: "经典", value: "classic" },
					{ text: "级联", value: "cascaded" },
				]}
			/>
		);
	}

	private _getClassicShadowGeneratorComponent() {
		const generator = this.state.generator as ShadowGenerator;

		if (!generator) {
			return null;
		}

		const shadowMap = generator.getShadowMap();

		return (
			<>
				{this.props.children}
				<EditorInspectorNumberField
					object={generator}
					property="bias"
					step={0.000001}
					min={0}
					max={1}
					label="偏移"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="normalBias"
					step={0.000001}
					min={0}
					max={1}
					label="法线偏移"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField object={generator} property="darkness" step={0.01} min={0} max={1} label="暗度" />

				{shadowMap && (
					<EditorInspectorListField
						object={shadowMap}
						property="refreshRate"
						label="刷新率"
						items={[
							{ text: "一次", value: RenderTargetTexture.REFRESHRATE_RENDER_ONCE },
							{ text: "2 帧", value: RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES },
							{ text: "每帧", value: RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME },
						]}
					/>
				)}

				<EditorInspectorSwitchField object={generator} property="transparencyShadow" label="启用透明阴影" />
				<EditorInspectorSwitchField object={generator} property="enableSoftTransparentShadow" label="启用柔和透明阴影" />
			</>
		);
	}

	private _getClassicSoftShadowComponent() {
		const generator = this.state.generator as ShadowGenerator | CascadedShadowGenerator;

		if (!generator) {
			return null;
		}

		return (
			<EditorInspectorSectionField title="柔和阴影">
				<EditorInspectorListField
					object={this}
					property="_softShadowType"
					label="柔和阴影类型"
					onChange={(v) => {
						this._updateSoftShadowType(v);
						updateLightShadowMapRefreshRate(this.props.light);
					}}
					items={[
						{ text: "无", value: "none" },
						...(isPointLight(this.props.light)
							? [{ text: "泊松采样", value: "usePoissonSampling" }]
							: [
									{ text: "百分比渐近过滤", value: "usePercentageCloserFiltering" },
									{ text: "接触硬化阴影", value: "useContactHardeningShadow" },
								]),
					]}
				/>

				{generator.usePoissonSampling && <EditorInspectorNumberField object={generator} property="blurScale" step={0.1} min={0} max={10} label="模糊缩放" />}

				{generator.usePercentageCloserFiltering && !generator.useContactHardeningShadow && (
					<>
						<EditorInspectorListField
							object={generator}
							property="filteringQuality"
							label="过滤质量"
							items={[
								{ text: "低", value: ShadowGenerator.QUALITY_LOW },
								{ text: "中", value: ShadowGenerator.QUALITY_MEDIUM },
								{ text: "高", value: ShadowGenerator.QUALITY_HIGH },
							]}
							onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
						/>
					</>
				)}

				{generator.useContactHardeningShadow && (
					<EditorInspectorNumberField
						object={generator.contactHardeningLightSizeUVRatio}
						property="blurScale"
						step={0.001}
						min={0}
						max={1}
						label="光源大小 UV 比率"
						onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
					/>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _getCascadedShadowGeneratorComponent() {
		const generator = this.state.generator;

		if (!generator || !isCascadedShadowGenerator(generator)) {
			return null;
		}

		return (
			<>
				{this.props.children}
				<EditorInspectorSwitchField
					object={generator}
					property="stabilizeCascades"
					label="稳定级联"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorSwitchField object={generator} property="depthClamp" label="深度钳制" onChange={() => updateLightShadowMapRefreshRate(this.props.light)} />
				<EditorInspectorSwitchField
					object={generator}
					property="autoCalcDepthBounds"
					label="自动计算深度范围"
					onChange={() => {
						this.forceUpdate();
						updateLightShadowMapRefreshRate(this.props.light);
					}}
				/>
				{generator.autoCalcDepthBounds && (
					<EditorInspectorNumberField
						object={generator}
						property="autoCalcDepthBoundsRefreshRate"
						step={1}
						min={0}
						max={60}
						label="自动计算深度范围刷新率"
						onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
					/>
				)}
				<EditorInspectorNumberField
					object={generator}
					property="lambda"
					min={0}
					max={1}
					label="Lambda"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="cascadeBlendPercentage"
					min={0}
					max={1}
					label="混合百分比"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="penumbraDarkness"
					min={0}
					max={1}
					label="半影暗度"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
			</>
		);
	}

	private _getSoftShadowType(generator: IShadowGenerator | null): SoftShadowType {
		if (generator && (isShadowGenerator(generator) || isCascadedShadowGenerator(generator))) {
			if (generator.usePercentageCloserFiltering) {
				return "usePercentageCloserFiltering";
			} else if (generator.useContactHardeningShadow) {
				return "useContactHardeningShadow";
			}
		}

		return "none";
	}

	private _updateSoftShadowType(type: SoftShadowType): void {
		if (this.state.generator && (isShadowGenerator(this.state.generator) || isCascadedShadowGenerator(this.state.generator))) {
			this.state.generator.usePoissonSampling = false;
			this.state.generator.useExponentialShadowMap = false;
			this.state.generator.useBlurExponentialShadowMap = false;
			this.state.generator.useCloseExponentialShadowMap = false;
			this.state.generator.useBlurCloseExponentialShadowMap = false;
			this.state.generator.usePercentageCloserFiltering = false;
			this.state.generator.useContactHardeningShadow = false;

			this.state.generator[type] = true;

			this.forceUpdate();
		}
	}
}
