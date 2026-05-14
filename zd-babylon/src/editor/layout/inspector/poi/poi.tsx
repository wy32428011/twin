import { Component, ReactNode } from "react";

import { TransformNode } from "babylonjs";

import { isTransformNode } from "../../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../../tools/observables";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

import { ShelfLayout } from "./shelf-layout";

import { IEditorInspectorImplementationProps } from "../inspector";

export class EditorPoiInspector extends Component<IEditorInspectorImplementationProps<TransformNode>> {
  public static IsSupported(object: unknown): boolean {
    return isTransformNode(object) && (object as TransformNode).metadata?.poiType != null;
  }

  public render(): ReactNode {
    const isShelfLayout = this.props.object.metadata.poiType === "货格布局器";

    return (
      <>
        <EditorInspectorSectionField title="属性">
          <div className="flex justify-between items-center px-2 py-2">
            <div className="w-1/2">类型</div>
            <div className="flex justify-between items-center w-full">
              <div className="text-white/50">{this.props.object.metadata.poiType}</div>
            </div>
          </div>
          <EditorInspectorStringField
            label="名称"
            object={this.props.object}
            property="name"
            onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
          />
        </EditorInspectorSectionField>

        {isShelfLayout && <ShelfLayout object={this.props.object} />}
      </>
    );
  }
}
