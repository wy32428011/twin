import { ipcRenderer } from "electron";
import { extname, dirname, basename, join, sep } from "path/posix";
import { copy, readdir, readJSONSync, stat, existsSync } from "fs-extra";

// import { toast } from "sonner";
import { Component, MouseEvent, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { FaCheck } from "react-icons/fa6";
import { IoIosStats } from "react-icons/io";
import { LuMove3D, LuRotate3D, LuScale3D } from "react-icons/lu";
import { GiArrowCursor, GiTeapot, GiWireframeGlobe } from "react-icons/gi";

import {
  AbstractEngine,
  AbstractMesh,
  Animation,
  Camera,
  Color3,
  CubicEase,
  EasingFunction,
  Engine,
  GizmoCoordinatesMode,
  Node,
  Scene,
  Tools,
  TransformNode,
  Vector2,
  Vector3,
  WebGPUEngine,
  PickingInfo,
  SceneLoaderFlags,
  EngineView,
  Sprite,
  Color4,
  BoundingBox,
  SerializationHelper,
} from "babylonjs";

import { Button } from "../../ui/shadcn/ui/button";
import { Toggle } from "../../ui/shadcn/ui/toggle";
import { Progress } from "../../ui/shadcn/ui/progress";
import { ToolbarRadioGroup, ToolbarRadioGroupItem } from "../../ui/shadcn/ui/toolbar-radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/shadcn/ui/select";

import { Editor } from "../main";

import { isSound } from "../../tools/guards/sound";
import { isVector3 } from "../../tools/guards/math";
import { isDomTextInputFocused } from "../../tools/dom";
import { isNodeLocked } from "../../tools/node/metadata";
import { registerUndoRedo } from "../../tools/undoredo";
import { isAnyParticleSystem } from "../../tools/guards/particles";
import { onNodesAddedObservable, onTextureAddedObservable } from "../../tools/observables";
import { getCameraFocusPositionFor } from "../../tools/camera/focus";
import { ITweenConfiguration, Tween } from "../../tools/animation/tween";
import { EditorMqttTwinRuntime } from "../../tools/mqtt/runtime";
import { checkProjectCachedCompressedTextures } from "../../tools/assets/ktx";
import { createSceneLink, getRootSceneLink } from "../../tools/scene/scene-link";
import { UniqueNumber, waitNextAnimationFrame, waitUntil } from "../../tools/tools";
import { isSprite, isSpriteManagerNode, isSpriteMapNode } from "../../tools/guards/sprites";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";
import { isAbstractMesh, isAnyTransformNode, isCamera, isCollisionInstancedMesh, isCollisionMesh, isGroundMesh, isLight, isMesh, isNode } from "../../tools/guards/nodes";

import { EditorCamera } from "../nodes/camera";

import { SpinnerUIComponent } from "../../ui/spinner";
import { Separator } from "../../ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/shadcn/ui/tooltip";

import { saveRenderingConfigurationForCamera } from "../rendering/tools";
import { disposeVLSPostProcess, parseVLSPostProcess, vlsPostProcessCameraConfigurations } from "../rendering/vls";
import { disposeSSRRenderingPipeline, parseSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "../rendering/ssr";
import { disposeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "../rendering/ssao";
import { disposeMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations, parseMotionBlurPostProcess } from "../rendering/motion-blur";
import { defaultPipelineCameraConfigurations, disposeDefaultRenderingPipeline, parseDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { EditorGraphContextMenu } from "./graph/graph";

import { EditorPreviewGizmo } from "./preview/gizmo";
import { EditorPreviewIcons } from "./preview/icons";
import { EditorPreviewCamera } from "./preview/camera";
import { EditorPreviewAxisHelper } from "./preview/axis";
import { EditorPreviewPlayComponent } from "./preview/play";
import { EditorPlay } from "./preview/editorPlay";

import { Stats } from "./preview/stats/stats";
import { StatRow } from "./preview/stats/row";
import { StatsValuesType } from "./preview/stats/types";

import { applyTextureAssetToObject } from "./preview/import/texture";
import { applyMaterialAssetToObject } from "./preview/import/material";
import { loadImportedSceneFile } from "./preview/import/import";
import { getAllMeshesFromChild, getRootParentMesh } from "./preview/utils";

export interface IEditorPreviewProps {
  /**
   * The editor reference.
   */
  editor: Editor;
}

export interface IEditorPreviewState {
  /**
   * Defines the information message drawn over the preview to tell the user what is happening.
   */
  informationMessage: ReactNode;

  isFocused: boolean;
  rightClickedObject?: any;
  pickingEnabled: boolean;

  showStatsValues: boolean;
  statsValues?: StatsValuesType;

  playEnabled: boolean;
  playSceneLoadingProgress: number;

  activeGizmo: "position" | "rotation" | "scaling" | "none";

  /**
   * Defines the fixed dimensions of the preview canvas.
   * "fit" means the canvas will fit the entire panel container.
   */
  fixedDimensions: "720p" | "1080p" | "4k" | "fit";
}

export class EditorPreview extends Component<IEditorPreviewProps, IEditorPreviewState> {
  /**
   * The engine of the preview.
   */
  public engine!: AbstractEngine;
  /**
   * The scene of the preview.
   */
  public scene!: Scene;
  /**
   * The camera of the preview.
   */
  public camera!: EditorCamera;

  /**
   * The gizmo manager of the preview
   */
  public gizmo!: EditorPreviewGizmo;
  /**
   * The helper drawn over the scene to help visualizing and selecting nodes like lights, cameras, particle systems, etc.
   */
  public icons!: EditorPreviewIcons;
  /**
   * The helper drawn over the scene to help visualizing the axis according to the current camera view.
   */
  public axis!: EditorPreviewAxisHelper;

  /**
   * The play component of the preview.
   */
  public play!: EditorPreviewPlayComponent;

  /**
   * The editor play logic for compilation, hot reload, and mesh visibility.
   */
  public editorPlay!: EditorPlay;

  /**
   * The current statistics of the preview.
   * This is used to display the FPS and other values.
   */
  public statistics!: Stats;

  _renderScene: boolean = true;
  private _mouseDownPosition: Vector2 = Vector2.Zero();

  private _objectUnderPointer!: AbstractMesh | Sprite | null;

  private _workingCanvas: HTMLCanvasElement | null = null;
  private _mainCanvas: HTMLCanvasElement | null = null;
  private _mainView: EngineView | null = null;
  private _mqttTwinRuntime: EditorMqttTwinRuntime | null = null;

  /** @internal */
  public _previewCamera: Camera | null = null;

  public constructor(props: IEditorPreviewProps) {
    super(props);

    this.editorPlay = new EditorPlay(props.editor);

    this.state = {
      isFocused: false,
      activeGizmo: "none",
      pickingEnabled: true,
      informationMessage: "",
      fixedDimensions: "fit",

      showStatsValues: false,

      playEnabled: false,
      playSceneLoadingProgress: 0,
    };

    ipcRenderer.on("gizmo:position", () => this.setActiveGizmo("position"));
    ipcRenderer.on("gizmo:rotation", () => this.setActiveGizmo("rotation"));
    ipcRenderer.on("gizmo:scaling", () => this.setActiveGizmo("scaling"));

    ipcRenderer.on("preview:focus", () => !isDomTextInputFocused() && this.focusObject());
    ipcRenderer.on("preview:edit-camera", () => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera));

    onTextureAddedObservable.add(() => checkProjectCachedCompressedTextures(props.editor));
  }

  public render(): ReactNode {
    return (
      <div className="relative w-full h-full text-foreground">
        <div className="flex flex-col w-full h-full">
          {this._getToolbar()}

          <EditorGraphContextMenu editor={this.props.editor} object={this.state.rightClickedObject} onOpenChange={(o) => !o && this._resetPointerContextInfo()}>
            <canvas
              ref={(r) => { this._onGotCanvasRef(r!) }}
              onDrop={(ev) => this._handleDrop(ev)}
              onDragOver={(ev) => {
                ev.preventDefault();
                this._handleMouseMove(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);
              }}
              onBlur={() => this.setState({ isFocused: false })}
              onFocus={() => this.setState({ isFocused: true })}
              onPointerUp={(ev) => this._handleMouseUp(ev)}
              onPointerDown={(ev) => this._handleMouseDown(ev)}
              onDoubleClick={(ev) => this._handleDoubleClick(ev)}
              onMouseLeave={() => this._handleMouseLeave()}
              onDragLeave={() => this._handleMouseLeave()}
              onMouseMove={() => this._handleMouseMove(this.scene?.pointerX, this.scene?.pointerY)}
              className={`
                                select-none outline-none w-full h-full object-contain
                                ${this.state.fixedDimensions !== "fit" ? "bg-black" : "bg-background"}
                                transition-all duration-300 ease-in-out
                            `}
            />

            {(this.play?.state.preparingPlay || this.play?.state.loading) && (
              <div className="absolute top-0 left-0 w-full h-full bg-black">
                <div className="flex flex-col justify-center items-center gap-10 w-full h-full bg-black">
                  <Grid width={24} height={24} color="gray" />

                  {this.play?.state.loading && <Progress className="w-1/2" value={this.state.playSceneLoadingProgress * 100} />}
                </div>
              </div>
            )}
          </EditorGraphContextMenu>
        </div>

        <EditorGraphContextMenu editor={this.props.editor} object={this.state.rightClickedObject} onOpenChange={(o) => !o && this._resetPointerContextInfo()}>
          <EditorPreviewIcons ref={(r) => this._onGotIconsRef(r!)} editor={this.props.editor} />
        </EditorGraphContextMenu>

        {this._previewCamera && this.scene?.cameras.includes(this._previewCamera) && (
          <EditorPreviewCamera hidden={this.play?.state.playing} key={this._previewCamera.id} editor={this.props.editor} camera={this._previewCamera} />
        )}

        <EditorPreviewAxisHelper ref={(r) => { this.axis = r! }} editor={this.props.editor} />

        <div
          style={{
            opacity: this.state.informationMessage ? "1" : "0",
            top: this.state.informationMessage ? "45px" : "-50px",
          }}
          className="absolute left-0 flex gap-2 items-center px-2 h-10 bg-black/50 transition-all duration-300 pointer-events-none"
        >
          <SpinnerUIComponent width="16" />
          <div>{this.state.informationMessage}</div>
        </div>
      </div>
    );
  }

  /**
   * Sets whether or not to render the scene.
   * @param render defines whether or not to render the scene.
   */
  public setRenderScene(render: boolean): void {
    this._renderScene = render;
  }

  /**
   * Resizes the engine.
   */
  public resize(): void {
    if (this.state.fixedDimensions === "fit") {
      this.engine?.resize();
    }
  }

  public startMqttTwinPreview(): void {
    this.stopMqttTwinPreview();

    if (!this.props.editor.state.mqtt.enabled || !this.props.editor.state.mqtt.enableEditorPreview || !this.scene) {
      return;
    }

    this._mqttTwinRuntime = new EditorMqttTwinRuntime({ scene: this.scene, mode: "editor" });
    this._mqttTwinRuntime.start();
  }

  public stopMqttTwinPreview(): void {
    this._mqttTwinRuntime?.stop();
    this._mqttTwinRuntime = null;
  }

  /**
   * Resets the preview component by re-creating the engine and an empty scene.
   */
  public async reset(): Promise<void> {
    if (!this._mainCanvas) {
      return;
    }

    this.stopMqttTwinPreview();

    this.axis?.stop();
    this.icons?.stop();

    disposeSSRRenderingPipeline();
    disposeMotionBlurPostProcess();
    disposeSSAO2RenderingPipeline();
    disposeDefaultRenderingPipeline();

    this.scene?.dispose();

    /**
     * engine.dispose() generates an error:
     * node_modules/babylonjs/babylon.js:1 Uncaught (in promise) InvalidAccessError: Failed to execute 'disconnect' on 'AudioNode': the given destination is not connected.
     * This error is located in _WebAudioMainBus class in the dispose method. It is not reproduced on the Babylon.js playground. This error
     * appeared after the migration to electron 35.7.5. A workaround consists on try/catching the dispose method.
     * It appears to work this way and the VRAM is successfully released during the second .dispose() call in the catch.
     * TODO: investigate in future bump of electron versions if the problem persists.
     */
    try {
      this.engine?.dispose();
    } catch (e) {
      this.engine?.dispose();
    }

    this.scene = null!;
    this.engine = null!;

    this._previewCamera = null;

    return this._onGotCanvasRef(this._mainCanvas);
  }

  /**
   * Sets the fixed dimensions of the renderer. This is particularly useful to test the rendering
   * performances and the aspect ratio of the scene in case it'll be renderer in fullscreen.
   */
  public setFixedDimensions(fixedDimensions: "720p" | "1080p" | "4k" | "fit"): void {
    this.setState({
      fixedDimensions,
    });

    if (!this.engine || !this._mainView || !this._mainCanvas) {
      return;
    }

    this._mainView!.customResize = undefined;

    switch (fixedDimensions) {
      case "720p":
        this._mainCanvas!.width = 1280;
        this._mainCanvas!.height = 720;

        this._mainView!.customResize = () => {
          this.engine.setSize(1280, 720);
        };
        break;
      case "1080p":
        this._mainCanvas!.width = 1920;
        this._mainCanvas!.height = 1080;

        this._mainView!.customResize = () => {
          this.engine.setSize(1920, 1080);
        };
        break;
      case "4k":
        this._mainCanvas!.width = 3840;
        this._mainCanvas!.height = 2160;

        this._mainView!.customResize = () => {
          this.engine.setSize(3840, 2160);
        };
        break;
    }
  }

  /**
   * Tries to focused the given object or the first one selected in the graph.
   */
  public focusObject(object?: any): void {
    let selectedNode = object ?? this.props.editor.layout.graph.getSelectedNodes()[0]?.nodeData;
    if (!selectedNode) {
      return;
    }

    // 如果是原始模型，聚焦到其对应的克隆体（场景中可见）
    if (isAbstractMesh(selectedNode) && selectedNode.metadata?.cloneForEditor) {
      const clone = this.scene.getMeshById(selectedNode.metadata.cloneForEditor);
      if (clone) {
        selectedNode = clone;
      }
    }

    const camera = this.scene.activeCamera;
    if (!camera) {
      return;
    }

    let target: Vector3 | undefined;
    let position: Vector3 | undefined;

    if (isCamera(selectedNode)) {
      target = selectedNode.globalPosition;
    } else if (isAbstractMesh(selectedNode)) {
      selectedNode.refreshBoundingInfo({
        applyMorph: true,
        applySkeleton: true,
        updatePositionsArray: true,
      });

      // 计算整个模型层级的联合包围盒，避免根节点无 geometry 导致退化
      let minWorld = new Vector3(Infinity, Infinity, Infinity);
      let maxWorld = new Vector3(-Infinity, -Infinity, -Infinity);

      const allMeshes = getAllMeshesFromChild(selectedNode);
      allMeshes.forEach((mesh) => {
        mesh.computeWorldMatrix(true);
        const bi = mesh.getBoundingInfo();
        if (bi) {
          minWorld = Vector3.Minimize(minWorld, bi.boundingBox.minimumWorld);
          maxWorld = Vector3.Maximize(maxWorld, bi.boundingBox.maximumWorld);
        }
      });

      const bb = selectedNode.getBoundingInfo();
      if (minWorld.x === Infinity) {
        minWorld = bb.boundingBox.minimumWorld;
        maxWorld = bb.boundingBox.maximumWorld;
      }

      const center = minWorld.add(maxWorld).scale(0.5);

      position = getCameraFocusPositionFor(center, camera, {
        distance: 2,
        minimum: minWorld,
        maximum: maxWorld,
      });
      target = center;

      // 克隆体使用 2.5D 俯视视角（18 度俯角，保持水平方向）
      if (selectedNode.metadata?.clonedFrom && position && target) {
        const toCamera = position.subtract(target).normalize();
        const horizontalLength = Math.sqrt(toCamera.x * toCamera.x + toCamera.z * toCamera.z);
        const idealDistance = position.subtract(target).length();

        if (horizontalLength > 0.001) {
          const angle = Math.PI / 10;
          const horizontalDir = new Vector3(toCamera.x / horizontalLength, 0, toCamera.z / horizontalLength);
          const direction = new Vector3(
            horizontalDir.x * Math.cos(angle),
            Math.sin(angle),
            horizontalDir.z * Math.cos(angle)
          ).normalize();

          position = target.add(direction.scale(idealDistance));
        }
      }
    } else if (isLight(selectedNode) || isAnyTransformNode(selectedNode)) {
      target = selectedNode.getAbsolutePosition();
    } else if (isAnyParticleSystem(selectedNode)) {
      if (isAbstractMesh(selectedNode.emitter)) {
        target = selectedNode.emitter.getAbsolutePosition();
      } else if (isVector3(selectedNode.emitter)) {
        target = selectedNode.emitter;
      }
    } else if (isSound(selectedNode)) {
      const soundPosition = (selectedNode as any)["_position"] as Vector3;

      if (selectedNode["_connectedTransformNode"]) {
        target = selectedNode["_connectedTransformNode"].getAbsolutePosition();
      } else if (!soundPosition.equalsToFloats(0, 0, 0)) {
        target = (selectedNode as any)["_position"]();
      }
    } else if (isSprite(selectedNode)) {
      const bb = new BoundingBox(new Vector3(-selectedNode.width * 0.5, -selectedNode.height * 0.5, 0), new Vector3(selectedNode.width * 0.5, selectedNode.height * 0.5, 0));
      const center = bb.centerWorld;

      position = getCameraFocusPositionFor(center, camera, {
        distance: 2,
        minimum: bb.minimumWorld,
        maximum: bb.maximumWorld,
      });

      target = selectedNode.position.clone();
    }

    if (target) {
      const tweenConfiguration = {
        target,
      } as ITweenConfiguration;

      if (position) {
        tweenConfiguration.position = position;
      }

      Tween.create(camera, 0.5, tweenConfiguration);
    }
  }

  /**
   * Sets the given camera active as a preview.
   * This helps to visualize what the selected camera sees when being manipulated
   * using gizmos for example.
   * When "null", the preview is removed.
   * @param camera the camera to activate the preview
   */
  public setCameraPreviewActive(camera: Camera | null): void {
    if (this._previewCamera === camera || camera === this.scene.activeCamera) {
      return;
    }

    this._previewCamera = camera;
    this.forceUpdate();
  }

  private _onGotIconsRef(ref: EditorPreviewIcons): void {
    if (this.icons) {
      return;
    }

    waitNextAnimationFrame().then(() => {
      this.icons = ref;
      this.icons?.start();
    });
  }

  private async _onGotCanvasRef(canvas: HTMLCanvasElement): Promise<void> {
    if (this.engine) {
      return;
    }

    this._mainCanvas ??= canvas;
    this._workingCanvas ??= document.createElement("canvas");

    await waitUntil(() => this.props.editor.path);

    // await Promise.all([await initializeRecast(this.props.editor), await initializeHavok(this.props.editor.path!)]);

    SceneLoaderFlags.ShowLoadingScreen = false;

    Animation.AllowMatricesInterpolation = true;
    Animation.AllowMatrixDecomposeForInterpolation = true;

    const webGpuSupported = false;
    // const webGpuSupported = await WebGPUEngine.IsSupportedAsync; // 有bug，别用

    if (webGpuSupported) {
      this.engine = await this._createWebgpuEngine(this._workingCanvas);
    } else {
      this.engine = new Engine(this._workingCanvas, true, {
        antialias: true,
        audioEngine: true,
        adaptToDeviceRatio: true,
        disableWebGL2Support: false,
        useHighPrecisionFloats: true,
        useHighPrecisionMatrix: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        useExactSrgbConversions: true,
      });
    }

    this.engine.disableContextMenu = false;
    this.engine.inputElement = this._mainCanvas;

    this.scene = new Scene(this.engine);
    this.scene.autoClear = true;
    this.scene.skipPointerUpPicking = true;
    this.scene.skipPointerDownPicking = true;
    this.scene.skipPointerMovePicking = true;

    if (!this.scene.soundTracks && this.scene.mainSoundTrack) {
      this.scene.soundTracks = [this.scene.mainSoundTrack];
    }

    this.camera = new EditorCamera("camera", Vector3.Zero(), this.scene);
    this.camera.attachControl(true);

    this.gizmo = new EditorPreviewGizmo(this.scene);
    this.startMqttTwinPreview();

    this.engine.hideLoadingUI();
    this._mainView = this.engine.registerView(this._mainCanvas);

    this.engine.runRenderLoop(() => {
      if (this._renderScene && !this.play.state.playing) {
        // TODO: remove this once fixed
        // Bug report on forum: https://forum.babylonjs.com/t/multi-canvas-and-post-processes/59616/23
        const ppRenderer = this.scene.prePassRenderer;
        if (ppRenderer) {
          ppRenderer.markAsDirty();
        }

        this.scene.render();

        if (!this.engine.activeView?.camera) {
          this.axis.scene?.render();
        }
        return;
      }

      if (this.play.canPlayScene) {
        try {
          return this.play.scene?.render();
        } catch (e) {
          if (e instanceof Error) {
            this.props.editor.layout.console.error(`Error while playing the scene:\n${e.message}`);
          }
          console.error(e);
          this.play.stop();
        }
      }
    });

    Tween.Scene = this.scene;
    Tween.DefaultEasing = {
      type: new CubicEase(),
      mode: EasingFunction.EASINGMODE_EASEINOUT,
    };

    // this.scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin());

    this.statistics = new Stats(this.props.editor);
    this.statistics.onValuesChangedObservable.add((values) => {
      if (this.state.showStatsValues) {
        this.setState({
          statsValues: { ...values },
        });
      }
    });

    this.axis?.start();
    this.icons?.start();

    this.forceUpdate();
  }

  private async _createWebgpuEngine(canvas: HTMLCanvasElement): Promise<WebGPUEngine> {
    const glslangJs = require("@babylonjs/core/assets/glslang/glslang.cjs");
    const glslang = await glslangJs(join(process.cwd(), "../node_modules/@babylonjs/core/assets/glslang/glslang.wasm"));

    const twgslJs = require("@babylonjs/core/assets/twgsl/twgsl.cjs");
    const twgsl = await twgslJs(join(process.cwd(), "../node_modules/@babylonjs/core/assets/twgsl/twgsl.wasm"));

    const engine = new WebGPUEngine(canvas, {
      antialias: true,
      audioEngine: true,
      adaptToDeviceRatio: true,
      glslangOptions: {
        glslang,
      },
      twgslOptions: {
        twgsl,
      },
      useHighPrecisionMatrix: true,
      powerPreference: "high-performance",
    });

    await engine.initAsync();

    return engine;
  }

  /** @internal */
  public _handleMouseLeave(): void {
    this._restoreCurrentMeshUnderPointer();
    this._objectUnderPointer = null;
  }

  private _mouseMoveTimeoutId: number = -1;

  private _handleMouseMove(x: number, y: number): void {
    if (!this.state.pickingEnabled) {
      return;
    }
    if (!this.scene) return;

    const pickingInfo = this._getPickingInfo(x, y);
    const pickedObject = pickingInfo.pickedSprite ?? pickingInfo.pickedMesh?._masterMesh ?? pickingInfo.pickedMesh;

    if (!pickedObject || (isNode(pickedObject) && isNodeLocked(pickedObject))) {
      this._restoreCurrentMeshUnderPointer();
      this._objectUnderPointer = null;
      return;
    }

    if (this._objectUnderPointer !== pickedObject) {
      this._restoreCurrentMeshUnderPointer();
      this._highlightCurrentMeshUnderPointer(pickedObject);

      this._objectUnderPointer = pickedObject;

      if (this._mouseMoveTimeoutId) {
        clearTimeout(this._mouseMoveTimeoutId);
      }

      this._mouseMoveTimeoutId = window.setTimeout(() => {
        this.forceUpdate();
      }, 200);
    }
  }

  private _handleMouseDown(event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
    if (!this.state.pickingEnabled) {
      return;
    }

    this._mouseDownPosition.set(event.clientX, event.clientY);

    if (event.button === 2) {
      this.setState({
        rightClickedObject: this._objectUnderPointer,
      });
    }

    this._restoreCurrentMeshUnderPointer();

    if (event.button === 2 && this._objectUnderPointer) {
      this.scene.activeCamera?.inputs.detachElement();
      this._handleMouseUp(event);
    }

    this._objectUnderPointer = null;
  }

  private _handleDoubleClick(_event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
    if (!this.state.pickingEnabled || this.axis._axisMeshUnderPointer) {
      return;
    }

    const pickingInfo = this._getPickingInfo(this.scene.pointerX, this.scene.pointerY);
    if (pickingInfo.pickedMesh || pickingInfo.pickedSprite) {
      this.focusObject(pickingInfo.pickedMesh ?? pickingInfo.pickedSprite);
    }
  }

  private _highlightedRootObj?: Node;

  private _handleMouseUp(event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
    if (!this.state.pickingEnabled) {
      return;
    }

    if (event.altKey || event.button === 1) {
      return;
    }

    const distance = Vector2.Distance(this._mouseDownPosition, new Vector2(event.clientX, event.clientY));

    if (distance > 2) {
      return;
    }

    const pickingInfo = this._getPickingInfo(this.scene.pointerX, this.scene.pointerY);

    let effectivePickedObject = (pickingInfo.pickedSprite ?? pickingInfo.pickedMesh?._masterMesh ?? pickingInfo.pickedMesh) as Node;
    if (effectivePickedObject && isNode(effectivePickedObject) && !isNodeLocked(effectivePickedObject)) {
      const sceneLink = getRootSceneLink(effectivePickedObject);
      if (sceneLink) {
        effectivePickedObject = sceneLink;
      }

      if (effectivePickedObject.parent && isSpriteMapNode(effectivePickedObject.parent) && effectivePickedObject.parent.outputPlane === effectivePickedObject) {
        effectivePickedObject = effectivePickedObject.parent;
      }
    }

    if (effectivePickedObject) {
      const pickedRootObj = getRootParentMesh(effectivePickedObject);
      this.gizmo.setAttachedObject(pickedRootObj);
      this.props.editor.layout.graph.setSelectedNode(pickedRootObj);
      this.props.editor.layout.inspector.setEditedObject(pickedRootObj);

      if (this._highlightedRootObj === pickedRootObj) return;

      if (this._highlightedRootObj) {
        // 清空之前的选中;
        const meshs = getAllMeshesFromChild(this._highlightedRootObj);
        meshs.forEach(m => {
          m.overlayAlpha = 0;
          m.overlayColor = Color3.Black();
          m.renderOverlay = true;
        });
        this._highlightedRootObj = undefined;
      }
      if ((pickedRootObj.name as string).match('.glb')) {
        const meshs = getAllMeshesFromChild(pickedRootObj);
        meshs.forEach(m => {
          Tween.killTweensOf(m);

          m.overlayAlpha = 0.5;
          m.overlayColor = Color3.Green();
          m.renderOverlay = true;
        });
        this._highlightedRootObj = pickedRootObj;
      }
    }
  }

  private _isEnvironmentMesh(mesh: AbstractMesh): boolean {
    return isGroundMesh(mesh) || mesh.material?.getClassName?.() === "SkyMaterial";
  }

  private _getPickingInfo(x: number, y: number): PickingInfo {
    const decalPick = this.scene.pick(
      x,
      y,
      (m) => {
        return m.metadata?.decal && m.isVisible && m.isEnabled();
      },
      false
    );

    const meshPick = this.scene.pick(
      x,
      y,
      (m) => {
        return !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m) && !this._isEnvironmentMesh(m) && m.isVisible && m.isEnabled();
      },
      false
    );

    const spritePick = this.scene.pickSprite(x, y, (s) => isSprite(s), false);

    let pickingInfo = meshPick;
    if (decalPick?.pickedPoint && meshPick?.pickedPoint) {
      const distance = Vector3.Distance(decalPick.pickedPoint, meshPick.pickedPoint);
      const zOffset = decalPick.pickedMesh?.material?.zOffset ?? 0;

      if (distance <= zOffset + 0.01) {
        pickingInfo = decalPick;
      }
    }

    if (spritePick?.pickedSprite) {
      if (!pickingInfo.pickedMesh) {
        pickingInfo = spritePick;
      } else if (pickingInfo.ray && spritePick.ray) {
        const spriteDistance = Vector2.Distance(spritePick.ray.origin, spritePick.pickedPoint!);
        const meshDistance = Vector3.Distance(pickingInfo.ray.origin, pickingInfo.pickedPoint!);

        if (spriteDistance <= meshDistance) {
          pickingInfo = spritePick;
        }
      }
    }

    return pickingInfo;
  }

  private _resetPointerContextInfo(): void {
    if (this.state.rightClickedObject) {
      this.setState({
        rightClickedObject: null,
      });

      this.scene.activeCamera?.inputs.attachElement();
    }
  }

  private _isHighlighting(pickedObject: AbstractMesh | Sprite) {
    return this._highlightedRootObj && (this._highlightedRootObj === getRootParentMesh(pickedObject));
  }

  private _getAllMeshesForHighlight(mesh: AbstractMesh): AbstractMesh[] {
    const rootMesh = getRootParentMesh(mesh);
    const meshes = getAllMeshesFromChild(rootMesh);

    const allMeshes = [...meshes];
    meshes.forEach((m) => {
      if (isMesh(m)) {
        m.getLODLevels().forEach((lod) => {
          if (lod.mesh && !allMeshes.includes(lod.mesh)) {
            allMeshes.push(lod.mesh);
          }
        });
      }
    });

    return allMeshes;
  }

  private _highlightCurrentMeshUnderPointer(pickedObject: AbstractMesh | Sprite): void {
    if (this._isHighlighting(pickedObject)) return;

    if (isAbstractMesh(pickedObject)) {
      const allMeshes = this._getAllMeshesForHighlight(pickedObject);

      allMeshes.forEach((mesh) => {
        Tween.killTweensOf(mesh);
        Tween.create(mesh, 0.1, {
          overlayAlpha: 0.5,
          overlayColor: Color3.Black(),
          onStart: () => (mesh!.renderOverlay = true),
        });
      });
    }

    if (isSprite(pickedObject)) {
      Tween.killTweensOf(pickedObject);
      pickedObject.overrideColor ??= new Color4(1, 1, 1, 1);

      Tween.create(pickedObject, 0.1, {
        overrideColor: new Color4(0.5, 0.5, 0.5, 1.0),
      });
    }
  }

  private _restoreCurrentMeshUnderPointer(): void {
    const objectUnderPointer = this._objectUnderPointer;

    if (objectUnderPointer) {
      if (this._isHighlighting(objectUnderPointer)) return;

      if (isAbstractMesh(objectUnderPointer)) {
        const allMeshes = this._getAllMeshesForHighlight(objectUnderPointer);

        allMeshes.forEach((mesh) => {
          Tween.killTweensOf(mesh);

          mesh.overlayAlpha ??= 0;
          mesh.overlayColor ??= Color3.Black();

          Tween.create(mesh, 0.1, {
            overlayAlpha: 0,
            overlayColor: Color3.Black(),
            onStart: () => (mesh.renderOverlay = true),
          });
        });
      }

      if (isSprite(objectUnderPointer)) {
        Tween.killTweensOf(objectUnderPointer);

        Tween.create(objectUnderPointer, 0.1, {
          overrideColor: new Color4(1.0, 1.0, 1.0, 1.0),
        });
      }
    }
  }

  private _getToolbar(): ReactNode {
    return (
      <div className="absolute top-0 left-0 w-full h-12 z-10">
        <div className="flex justify-between items-center gap-4 h-full bg-background/95 w-full px-2 py-1">
          {
            this.play?.state.playing && <div /> // For justify between
          }

          {!this.play?.state.playing && this._getEditToolbar()}

          <div className="flex gap-2 items-center h-10">
            <EditorPreviewPlayComponent
              ref={(r) => { this.play = r! }}
              editor={this.props.editor}
              enabled={this.state.playEnabled}
              onRestart={() => this.play.restart()}
            />
          </div>
        </div>
      </div>
    );
  }

  private _getEditToolbar(): ReactNode {
    return (
      <div className="flex gap-2 items-center h-10">
        <TooltipProvider>
          <Select value={this.scene?.activeCamera?.id} onOpenChange={(o) => o && this.forceUpdate()} onValueChange={(v) => this._switchToCamera(v)}>
            <SelectTrigger className="w-36 border-none bg-muted/50">
              <SelectValue placeholder="选择值..." />
            </SelectTrigger>
            <SelectContent>
              {this.scene?.cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-[24px]" />

          <ToolbarRadioGroup
            value={this.state.activeGizmo === "none" ? "select" : this.state.activeGizmo}
            onValueChange={(value) => {
              if (value === "select") {
                this.setActiveGizmo("none");
              } else {
                this.setActiveGizmo(value as "position" | "rotation" | "scaling");
              }
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarRadioGroupItem value="select" className={this.state.activeGizmo === "none" ? "bg-primary/20" : ""}>
                  <GiArrowCursor className="h-4 w-4" />
                </ToolbarRadioGroupItem>
              </TooltipTrigger>
              <TooltipContent>选择模式</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarRadioGroupItem value="position" className={this.state.activeGizmo === "position" ? "bg-primary/20" : ""}>
                  <LuMove3D height={16} />
                </ToolbarRadioGroupItem>
              </TooltipTrigger>
              <TooltipContent>位移</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarRadioGroupItem value="rotation" className={this.state.activeGizmo === "rotation" ? "bg-primary/20" : ""}>
                  <LuRotate3D height={16} />
                </ToolbarRadioGroupItem>
              </TooltipTrigger>
              <TooltipContent>旋转</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarRadioGroupItem value="scaling" className={this.state.activeGizmo === "scaling" ? "bg-primary/20" : ""}>
                  <LuScale3D height={16} />
                </ToolbarRadioGroupItem>
              </TooltipTrigger>
              <TooltipContent>缩放</TooltipContent>
            </Tooltip>
          </ToolbarRadioGroup>

          <Separator orientation="vertical" className="mx-1 h-[24px]" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                className={this.scene?.forceWireframe ? "!px-2 !py-2 bg-primary/20" : "!px-2 !py-2"}
                pressed={this.scene?.forceWireframe}
                onPressedChange={() => {
                  this.scene.forceWireframe = !this.scene.forceWireframe;
                  this.forceUpdate();
                }}
              >
                <GiWireframeGlobe className="w-6 h-6 scale-125" strokeWidth={1} color="white" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>线框模式</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-[24px]" />

          <Select
            value={this.gizmo?.getCoordinateMode().toString()}
            onValueChange={(v) => {
              this.gizmo?.setCoordinatesMode(parseInt(v));
              this.forceUpdate();
            }}
          >
            <SelectTrigger className="w-32 border-none bg-muted/50">
              <SelectValue placeholder="选择值..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GizmoCoordinatesMode.World.toString()}>世界</SelectItem>
              <SelectItem value={GizmoCoordinatesMode.Local.toString()}>本地</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-[24px]" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-1 py-1 w-9 h-9">
                <GiTeapot className="w-6 h-6" strokeWidth={1} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={() => this.forceUpdate()}>
              <DropdownMenuLabel>渲染选项</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.axis.enabled ? this.axis.stop() : this.axis.start())}>
                {this.axis?.enabled && <FaCheck className="w-4 h-4" />} 坐标轴
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.icons.enabled ? this.icons.stop() : this.icons.start())}>
                {this.icons?.enabled && <FaCheck className="w-4 h-4" />} 图标
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.postProcessesEnabled = !this.scene.postProcessesEnabled)}>
                {this.scene?.postProcessesEnabled && <FaCheck className="w-4 h-4" />} 后处理
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.texturesEnabled = !this.scene.texturesEnabled)}>
                {this.scene?.texturesEnabled && <FaCheck className="w-4 h-4" />} 纹理
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.lightsEnabled = !this.scene.lightsEnabled)}>
                {this.scene?.lightsEnabled && <FaCheck className="w-4 h-4" />} 光照
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex gap-2 items-center"
                onClick={() => {
                  this.scene.shadowsEnabled = !this.scene.shadowsEnabled;
                  this.scene.renderTargetsEnabled = this.scene.shadowsEnabled;
                }}
              >
                {this.scene?.shadowsEnabled && <FaCheck className="w-4 h-4" />} 阴影
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.particlesEnabled = !this.scene.particlesEnabled)}>
                {this.scene?.particlesEnabled && <FaCheck className="w-4 h-4" />} 粒子
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>渲染尺寸</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("720p")}>
                {this.state.fixedDimensions === "720p" && <FaCheck className="w-4 h-4" />} 720p
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("1080p")}>
                {this.state.fixedDimensions === "1080p" && <FaCheck className="w-4 h-4" />} 1080p
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("4k")}>
                {this.state.fixedDimensions === "4k" && <FaCheck className="w-4 h-4" />} 4K (UHD)
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("fit")}>
                {this.state.fixedDimensions === "fit" && <FaCheck className="w-4 h-4" />} 自适应
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu onOpenChange={(o) => this.setState({ showStatsValues: o })}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-1 py-1 w-9 h-9">
                <IoIosStats className="w-6 h-6" strokeWidth={1} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" onClick={() => this.forceUpdate()}>
              <DropdownMenuLabel>统计信息</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex flex-col gap-1">
                <StatRow label="平均 FPS" value={this.state.statsValues?.averageFPS} />
                <StatRow label="瞬时 FPS" value={this.state.statsValues?.instantaneousFPS} />
                <StatRow label="绘制调用" value={this.state.statsValues?.drawCalls} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex flex-col gap-1">
                <StatRow label="活动面数" value={this.state.statsValues?.activeFaces} />
                <StatRow label="活动网格" value={this.state.statsValues?.activeMeshes} />
                <StatRow label="活动索引" value={this.state.statsValues?.activeIndices} />
                <StatRow label="活动骨骼" value={this.state.statsValues?.activeBones} />
                <StatRow label="活动粒子" value={this.state.statsValues?.activeParticles} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex flex-col gap-1">
                <StatRow label="总网格" value={this.state.statsValues?.totalMeshes} />
                <StatRow label="总顶点" value={this.state.statsValues?.totalVertices} />
                <StatRow label="总材质" value={this.state.statsValues?.totalMaterials} />
                <StatRow label="总纹理" value={this.state.statsValues?.totalTextures} />
                <StatRow label="总光源" value={this.state.statsValues?.totalLights} />
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>
    );
  }

  private _switchToCamera(id: string): void {
    const camera = this.scene.cameras.find((c) => c.id === id);
    if (!camera) {
      return;
    }

    if (this.scene.activeCamera) {
      saveRenderingConfigurationForCamera(this.scene.activeCamera);
    }

    this.scene.activeCamera?.detachControl();

    this.scene.activeCamera = camera;
    if (!isNodeLocked(camera)) {
      this.scene.activeCamera?.attachControl(true);
    }

    disposeSSAO2RenderingPipeline();
    disposeVLSPostProcess(this.props.editor);
    disposeSSRRenderingPipeline();
    disposeMotionBlurPostProcess();
    disposeDefaultRenderingPipeline();

    const ssao2Pipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
    if (ssao2Pipeline) {
      parseSSAO2RenderingPipeline(this.props.editor, ssao2Pipeline);
    }

    const vlsPostProcess = vlsPostProcessCameraConfigurations.get(camera);
    if (vlsPostProcess) {
      parseVLSPostProcess(this.props.editor, vlsPostProcess);
    }

    const ssrPipeline = ssrRenderingPipelineCameraConfigurations.get(camera);
    if (ssrPipeline) {
      parseSSRRenderingPipeline(this.props.editor, ssrPipeline);
    }

    const motionBlurPostProcess = motionBlurPostProcessCameraConfigurations.get(camera);
    if (motionBlurPostProcess) {
      parseMotionBlurPostProcess(this.props.editor, motionBlurPostProcess);
    }

    const defaultRenderingPipeline = defaultPipelineCameraConfigurations.get(camera);
    if (defaultRenderingPipeline) {
      parseDefaultRenderingPipeline(this.props.editor, defaultRenderingPipeline);
    }

    this.scene.lights.forEach((light) => {
      light.getShadowGenerators()?.forEach((shadowGenerator) => {
        const shadowMap = shadowGenerator.getShadowMap();
        if (shadowMap) {
          shadowMap.activeCamera = camera;
        }
      });
    });

    this.props.editor.layout.inspector.forceUpdate();

    if (this._previewCamera === camera) {
      this.setCameraPreviewActive(null);
    }
  }

  /**
   * Sets the currently active gizmo. Set "none" to deactivate the gizmo.
   * @param gizmo defines the type of gizmo to activate.
   */
  public setActiveGizmo(gizmo: "position" | "rotation" | "scaling" | "none"): void {
    if (this.state.activeGizmo === gizmo) {
      gizmo = "none";
    }

    this.gizmo.setGizmoType(gizmo);
    this.setState({ activeGizmo: gizmo });
  }

  public async importSceneFile(absolutePath: string, useCloudConverter: boolean): Promise<AbstractMesh | undefined> {
    if (useCloudConverter) {
      const extension = extname(absolutePath).toLowerCase();
      switch (extension) {
        case ".fbx":
        case ".blend":
          // let progressRef: EditorPreviewConvertProgress;
          // this.setState({
          //   informationMessage: <EditorPreviewConvertProgress absolutePath={absolutePath} ref={(r) => (progressRef = r!)} />,
          // });

          // const newAbsolutePath = await tryConvertSceneFile(absolutePath, (value) => progressRef?.setState({ value }));

          // if (newAbsolutePath) {
          //   absolutePath = newAbsolutePath;
          // } else {
          //   useCloudConverter = false;

          //   toast.error("Failed to convert the file. Fallback on local Assimp loader.");
          //   this.setState({
          //     informationMessage: null,
          //   });
          // }
          break;
      }
    }

    this.setState({ informationMessage: `Importing scene "${basename(absolutePath)}"...` });
    const result = await loadImportedSceneFile(this.scene, absolutePath);
    // copy script files
    const dirPath = dirname(absolutePath);
    const files = (await readdir(dirPath, { withFileTypes: true })).filter(f => f.name.endsWith('.ts'));
    // 
    const pathArray = dirPath.split(sep);
    const index = pathArray.findLastIndex(p => p === "assets");
    const pathFromAssets = pathArray.splice(index);
    pathFromAssets.shift(); // remove assets
    const destination = join(...pathArray, 'src', 'scripts', ...pathFromAssets);

    await copy(dirPath, destination, {
      // 只拷贝 .ts文件
      filter: async (f) => {
        const filePath = f.replace(/\\/g, "/");
        const fileStat = await stat(filePath);
        return fileStat.isDirectory() || filePath.endsWith('.ts');
      },
      recursive: true,
    });

    // 将script的metadata加入
    const theMesh = result?.meshes.find(({ name }) => name === basename(absolutePath));

    theMesh!.metadata.scripts ??= [];
    files.forEach(file => {
      theMesh!.metadata.scripts.push({
        enabled: true,
        key: join("scripts", ...pathFromAssets, file.name),
      })
    });

    const metaFile = join(...dirPath.split(sep), "meta.json");
    if (existsSync(metaFile)) {
      const preparedMeta = readJSONSync(metaFile);
      // 反序列赋值
      if (preparedMeta?.meshes?.[0]) SerializationHelper.ParseProperties(preparedMeta.meshes[0], theMesh, this.scene, null);
    }

    const { handleExportScripts } = require("../../project/export/scripts");
    await handleExportScripts(this.props.editor);

    return theMesh;
  }

  private async _handleDrop(ev: React.DragEvent<HTMLCanvasElement>): Promise<void> {
    const assets = ev.dataTransfer.getData("assets");
    if (assets) {
      return this._handleAssetsDropped(ev);
    }

    const graphNode = ev.dataTransfer.getData("graph/node");
    if (graphNode) {
      return this._handleGraphNodesDropped(ev);
    }

    const poiItem = ev.dataTransfer.getData("poi-item");
    if (poiItem) {
      return this._handlePoiItemDropped(ev);
    }

    const sprite = ev.dataTransfer.getData("sprite");
    if (sprite) {
      return this._handleSpritesDropped(ev);
    }
  }

  private _handleGraphNodesDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
    const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);
    const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

    if (!mesh || !pick.pickedPoint) {
      return;
    }

    const pickedPoint = pick.pickedPoint.clone();

    const nodesToMove = this.props.editor.layout.graph.getSelectedNodes();
    const oldPositionsMap = new Map<unknown, Vector3>();

    nodesToMove.forEach((n) => {
      if (isAnyTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
        oldPositionsMap.set(n.nodeData, n.nodeData.getAbsolutePosition().clone());
      } else if (isSprite(n.nodeData)) {
        oldPositionsMap.set(n.nodeData, n.nodeData.position.clone());
      }
    });

    registerUndoRedo({
      executeRedo: true,
      undo: () => {
        nodesToMove.forEach((n) => {
          if (oldPositionsMap.has(n.nodeData)) {
            if (isAnyTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
              n.nodeData.setAbsolutePosition(oldPositionsMap.get(n.nodeData)!);
            } else if (isSprite(n.nodeData)) {
              n.nodeData.position.copyFrom(oldPositionsMap.get(n.nodeData)!);
            }
          }
        });
      },
      redo: () => {
        nodesToMove.forEach((n) => {
          if (isAnyTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
            n.nodeData.setAbsolutePosition(pickedPoint);
          } else if (isSprite(n.nodeData)) {
            n.nodeData.position.copyFrom(pickedPoint);
          }
        });
      },
    });
  }

  private _handleSpritesDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
    const data = JSON.parse(ev.dataTransfer.getData("sprite"));
    const spriteNode = this.scene.getNodeById(data.spriteNodeId);

    if (!isSpriteManagerNode(spriteNode) || !spriteNode.spriteManager) {
      return;
    }

    const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);

    const sprite = new Sprite(`sprite-${spriteNode.spriteManager.sprites.length}`, spriteNode.spriteManager);
    sprite.size = 100;
    sprite.uniqueId = UniqueNumber.Get();

    if (data.cellRef) {
      sprite.cellRef = data.cellRef;

      sprite.width = spriteNode.atlasJson.frames[data.cellRef].sourceSize.w;
      sprite.height = spriteNode.atlasJson.frames[data.cellRef].sourceSize.h;
    } else if (data.cellIndex !== undefined) {
      sprite.cellIndex = data.cellIndex;
    }

    if (pick.pickedPoint) {
      sprite.position.copyFrom(pick.pickedPoint);
    }

    this.gizmo.setAttachedObject(sprite);
    this.props.editor.layout.graph.refresh();
  }

  private _handlePoiItemDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
    const poiName = ev.dataTransfer.getData("poi-item");
    const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);

    const node = new TransformNode(poiName, this.scene);
    node.id = Tools.RandomId();
    node.uniqueId = UniqueNumber.Get();
    node.metadata = { poiType: poiName };

    if (pick?.pickedPoint) {
      node.position.copyFrom(pick.pickedPoint);
    }

    onNodesAddedObservable.notifyObservers();
    this.props.editor.layout.graph.refresh();
  }

  private _handleAssetsDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
    const absolutePaths = this.props.editor.layout.assets.state.selectedKeys;

    absolutePaths.forEach(async (absolutePath) => {
      await waitNextAnimationFrame();
      const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);
      const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

      const extension = extname(absolutePath).toLowerCase();
      switch (extension) {
        case ".x":
        case ".b3d":
        case ".dae":
        case ".glb":
        case ".gltf":
        case ".fbx":
        case ".stl":
        case ".lwo":
        case ".dxf":
        case ".obj":
        case ".3ds":
        case ".ms3d":
        case ".blend":
        case ".babylon":
          this.importSceneFile(absolutePath, ev.shiftKey).then((result) => {
            if (pick.pickedPoint) {
              pick.pickedPoint.y = 0;
              result?.position.addInPlace(pick.pickedPoint!);
            }
            return this.editorPlay.hotReloadScriptForNotPlaying('', true, result);
          }).then(() => {
            this.setState({ informationMessage: "" });
          });
          break;

        case ".env":
        case ".jpg":
        case ".png":
        case ".webp":
        case ".bmp":
        case ".jpeg":
          applyTextureAssetToObject(this.props.editor, mesh ?? this.scene, absolutePath);
          break;

        case ".material":
          applyMaterialAssetToObject(this.props.editor, mesh, absolutePath);
          break;

        case ".scene":
          createSceneLink(this.props.editor, absolutePath).then((node) => {
            this.setRenderScene(true);

            if (pick.pickedPoint) {
              node?.position.addInPlace(pick.pickedPoint);
            }
          });
          break;

        case ".gui":
          if (this.props.editor.state.enableExperimentalFeatures) {
            // applyImportedGuiFile(this.props.editor, absolutePath).then(() => {
            //   this.props.editor.layout.graph.refresh();
            // });
          }
          break;

        case ".mp3":
        case ".ogg":
        case ".wav":
        case ".wave":
          // applySoundAsset(this.props.editor, mesh ?? this.scene, absolutePath).then(() => {
          //   this.props.editor.layout.graph.refresh();
          // });
          break;

        case ".npss":
          if (mesh) {
            // loadImportedParticleSystemFile(this.props.editor.layout.preview.scene, mesh, absolutePath).then(() => {
            //   this.props.editor.layout.graph.refresh();
            // });
          }
          break;
      }
    });
  }
}
