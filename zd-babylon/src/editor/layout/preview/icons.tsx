import { Component, ReactNode } from "react";

import { Mesh, Node, Vector2 } from "babylonjs";

import { Editor } from "../../main";

import { isNodeLocked } from "../../../tools/node/metadata";
import { isNode } from "../../../tools/guards/nodes";

export interface IEditorPreviewIconsProps {
  editor: Editor;
}

export interface IEditorPreviewIconsState {
  buttons: _IButtonData[];
}

interface _IButtonData {
  position: Vector2;
  node: Node;
}

export class EditorPreviewIcons extends Component<IEditorPreviewIconsProps, IEditorPreviewIconsState> {
  private _tempMesh: Mesh | null = null;
  private _renderFunction: (() => void) | null = null;

  public constructor(props: IEditorPreviewIconsProps) {
    super(props);

    this.state = {
      buttons: [],
    };
  }

  public render(): ReactNode {
    return (
      <div hidden={this.props.editor.layout.preview?.play?.state.playing} className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {this.state.buttons.map((button) => (
          <div
            key={button.node.id}
            style={{
              top: `${button.position.y}px`,
              left: `${button.position.x}px`,
            }}
            onContextMenu={() => {
              if (isNode(button.node)) {
                this.props.editor.layout.preview.setState({
                  rightClickedObject: button.node,
                });
              }
            }}
            onClick={() => {
              this.props.editor.layout.graph.setSelectedNode(button.node);
              this.props.editor.layout.inspector.setEditedObject(button.node);

              if (isNode(button.node)) {
                this.props.editor.layout.preview.gizmo.setAttachedObject(button.node);
              }
            }}
            className={`
              absolute w-16 h-16 rounded-lg -translate-x-1/2 -translate-y-1/2 hover:bg-black/20 transition-colors duration-300
              ${isNode(button.node) && isNodeLocked(button.node) ? "pointer-events-none" : "pointer-events-auto"}
            `}
          />
        ))}
      </div>
    );
  }

  public componentWillUnmount(): void {
    this.stop();
  }

  /**
   * Gets wether or not icons are enabled.
   */
  public get enabled(): boolean {
    return this._renderFunction !== null;
  }

  /**
   * Starts rendering icons on the preview scene.
   */
  public start(): void {
    const scene = this.props.editor.layout.preview.scene;

    if (this._renderFunction || !scene) {
      return;
    }

    this._tempMesh?.dispose(true, true);

    this._tempMesh = new Mesh("editor-preview-icons-temp-node", this.props.editor.layout.preview.scene);
    this._tempMesh._removeFromSceneRootNodes();
    this.props.editor.layout.preview.scene.meshes.pop();

    const buttons: _IButtonData[] = [];

    scene.getEngine().runRenderLoop(
      (this._renderFunction = () => {
        buttons.splice(0, buttons.length);

        this.setState({ buttons });
      })
    );
  }

  /**
   * Stops rendering icons on the preview scene.
   */
  public stop(): void {
    if (this._renderFunction) {
      this.props.editor.layout.preview.engine.stopRenderLoop(this._renderFunction);
    }

    this._renderFunction = null;

    this.setState({
      buttons: [],
    });
  }
}
