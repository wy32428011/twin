import { Component, ReactNode } from "react";

import { Editor } from "../main";

import { ModelGenerator } from "./poi-library/model-generator";

export interface IEditorPoiLibraryProps {
  editor: Editor;
}

export interface IEditorPoiLibraryState {}

export class EditorPoiLibrary extends Component<IEditorPoiLibraryProps, IEditorPoiLibraryState> {
  public constructor(props: IEditorPoiLibraryProps) {
    super(props);

    this.state = {};
  }

  public render(): ReactNode {
    return (
      <div className="flex flex-col w-full h-full">
        <ModelGenerator editor={this.props.editor} />
      </div>
    );
  }
}
