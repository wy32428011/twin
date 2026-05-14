import { platform } from "os";

import { Component, PropsWithChildren, ReactNode } from "react";

import { AiOutlineClose } from "react-icons/ai";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "../../../ui/shadcn/ui/context-menu";

import { isScene, } from "../../../tools/guards/scene";
import { isNode } from "../../../tools/guards/nodes";

import { Editor } from "../../main";

import { removeNodes } from "./remove";
import { cloneByEditor } from "./clone";

export interface IEditorGraphContextMenuProps extends PropsWithChildren {
  editor: Editor;
  object: any | null;
  from?: string;

  onOpenChange?(open: boolean): void;
}

export class EditorGraphContextMenu extends Component<IEditorGraphContextMenuProps> {
  public render(): ReactNode {
    return (
      <ContextMenu onOpenChange={(o) => this.props.onOpenChange?.(o)}>
        <ContextMenuTrigger className="w-full h-full">{this.props.children}</ContextMenuTrigger>

        {this.props.object && (
          <ContextMenuContent className="w-48">
            <>
              {isNode(this.props.object) && (
                <>
                  {this._getMeshItems()}
                </>
              )}

              {!isScene(this.props.object) && this.props.from === 'graph' && (
                <>
                  <ContextMenuSeparator />
                  {this._getRemoveItems()}
                </>
              )}
            </>
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
  }

  private _getRemoveItems(): ReactNode {
    return (
      <ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => removeNodes(this.props.editor)}>
        <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> 删除
      </ContextMenuItem>
    );
  }

  private _getMeshItems(): ReactNode {
    return (
      <>
        <ContextMenuItem onClick={() => this.props.editor.layout.preview.focusObject(this.props.object)}>
          聚焦
          <ContextMenuShortcut>{platform() === "darwin" ? "⌘+F" : "CTRL+F"}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => cloneByEditor(this.props.editor, this.props.object)}>
          阵列
        </ContextMenuItem>

        {/* {isMesh(this.props.object) && (
					<>
						<ContextMenuSeparator />

						<ContextMenuItem onClick={() => this._createMeshInstance(this.props.object)}>Create Instance</ContextMenuItem>

						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => this._updateMeshGeometry(this.props.object)}>Update Geometry...</ContextMenuItem>
					</>
				)} */}
      </>
    );
  }
}
