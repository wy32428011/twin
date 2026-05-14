import { Component, ReactNode } from "react";
import { Icon, NonIdealState } from "@blueprintjs/core";

import { FaInfoCircle } from "react-icons/fa";
// import { FaCube, FaSprayCanSparkles } from "react-icons/fa6";

import { Tools } from "babylonjs";

import { Editor } from "../main";

import { Badge } from "../../ui/shadcn/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/shadcn/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../ui/shadcn/ui/hover-card";

import { isMesh, isNode } from "../../tools/guards/nodes";
import { isNodeLocked } from "../../tools/node/metadata";

import { setInspectorSearch } from "./inspector/fields/field";
import { IEditorInspectorImplementationProps } from "./inspector/inspector";

// import { EditorSceneInspector } from "./inspector/scene/scene";

import { EditorMeshInspector } from "./inspector/mesh/mesh";
import { EditorMqttInspector } from "./inspector/mqtt/mqtt";
import { EditorPoiInspector } from "./inspector/poi/poi";
// import { EditorTransformNodeInspector } from "./inspector/transform";

// import { EditorFileInspector } from "./inspector/file";

import { EditorSpotLightInspector } from "./inspector/light/spot";
import { EditorPointLightInspector } from "./inspector/light/point";
import { EditorDirectionalLightInspector } from "./inspector/light/directional";
import { EditorHemisphericLightInspector } from "./inspector/light/hemispheric";

import { EditorCameraInspector } from "./inspector/camera/editor";
import { EditorFreeCameraInspector } from "./inspector/camera/free";
import { EditorArcRotateCameraInspector } from "./inspector/camera/arc-rotate";

// import { EditorSoundInspector } from "./inspector/sound/sound";

// import { EditorAdvancedDynamicTextureInspector } from "./inspector/gui/gui";

// import { EditorDecalsInspector } from "./inspector/decals/decals";

// import { EditorParticleSystemInspector } from "./inspector/particles/particle-system";
// import { EditorGPUParticleSystemInspector } from "./inspector/particles/gpu-particle-system";

// import { EditorSpriteInspector } from "./inspector/sprites/sprite";
// import { EditorSpriteMapNodeInspector } from "./inspector/sprites/sprite-map";
// import { EditorSpriteManagerNodeInspector } from "./inspector/sprites/sprite-manager";

// import { EditorSkeletonInspector } from "./inspector/mesh/skeleton";

export interface IEditorInspectorProps {
  /**
   * The editor reference.
   */
  editor: Editor;
}

export interface IEditorInspectorState {
  search: string;
  editedObject: unknown | null;
}

export class EditorInspector extends Component<IEditorInspectorProps, IEditorInspectorState> {
  private static _inspectors: ((new (props: IEditorInspectorImplementationProps<any>) => Component<IEditorInspectorImplementationProps<any>>) & {
    IsSupported(object: any): boolean;
  })[] = [
      EditorPoiInspector,
      // EditorTransformNodeInspector,
      EditorMeshInspector,
      EditorMqttInspector,

      // EditorFileInspector,

      EditorPointLightInspector,
      EditorDirectionalLightInspector,
      EditorSpotLightInspector,
      EditorHemisphericLightInspector,

      EditorCameraInspector,
      EditorFreeCameraInspector,
      EditorArcRotateCameraInspector,

      // EditorSceneInspector,

      // EditorSoundInspector,
      // EditorAdvancedDynamicTextureInspector,

      // EditorParticleSystemInspector,
      // EditorGPUParticleSystemInspector,

      // EditorSpriteMapNodeInspector,
      // EditorSpriteManagerNodeInspector,
      // EditorSpriteInspector,

      // EditorSkeletonInspector,
    ];

  public constructor(props: IEditorInspectorProps) {
    super(props);

    this.state = {
      search: "",
      editedObject: null,
    };
  }

  public render(): ReactNode {
    const disabled = (this.state.editedObject && isNode(this.state.editedObject) && isNodeLocked(this.state.editedObject)) ?? false;

    return (
      <div className="flex flex-col gap-2 w-full h-full p-2 text-foreground overflow-hidden">
        <div className="flex flex-col gap-2 w-full h-full">
          {disabled && (
            <HoverCard openDelay={150} closeDelay={150}>
              <HoverCardTrigger className="w-full">
                <Badge variant="secondary" className="flex items-center gap-2 w-full">
                  <FaInfoCircle className="w-6 h-6" />
                  对象已锁定，无法编辑。
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent>该对象已锁定，无法在检查器中修改。您可以在场景图中解锁它。</HoverCardContent>
            </HoverCard>
          )}

          <input
            type="text"
            placeholder="搜索..."
            value={this.state.search}
            onChange={(e) => this._handleSearchChanged(e.currentTarget.value)}
            className="px-5 py-2 rounded-lg bg-primary-foreground outline-none w-full"
          />

          <div className="w-full h-full overflow-auto">
            <div className={`flex flex-col gap-2 h-full ${disabled ? "pointer-events-none opacity-50 cursor-not-allowed" : ""}`}>{this._getContent()}</div>
          </div>

        </div>
      </div>
    );
  }

  /**
   * Sets the edited object.
   * @param editedObject defines the edited object.
   */
  public setEditedObject(editedObject: unknown): void {
    if (isMesh(editedObject) && editedObject.metadata?.clonedFrom) {
      const scene = this.props.editor.layout.preview.scene;
      const original = scene.getMeshById(editedObject.metadata.clonedFrom);
      if (original) {
        editedObject = original;
      }
    }
    this.setState({ editedObject });
  }

  private _getContent(): ReactNode {
    if (!this.state.editedObject) {
      return <NonIdealState icon={<Icon icon="search" size={96} />} title={<div className="text-white">未选择对象</div>} />;
    }

    const inspectors = EditorInspector._inspectors.filter((i) => i.IsSupported(this.state.editedObject)).map((i) => ({ inspector: i }));

    return inspectors.map((i) => <i.inspector key={Tools.RandomId()} editor={this.props.editor} object={this.state.editedObject} />);
  }

  private _handleSearchChanged(search: string): void {
    setInspectorSearch(search);
    this.setState({ search });
  }
}
