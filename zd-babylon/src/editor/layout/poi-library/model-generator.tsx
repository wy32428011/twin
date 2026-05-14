import { Component, ReactNode } from "react";

import { BiCube } from "react-icons/bi";
import { LuLayoutGrid } from "react-icons/lu";
import { FaMagnifyingGlass } from "react-icons/fa6";

import { Editor } from "../../main";

import { Input } from "../../../ui/shadcn/ui/input";

interface IPoiItem {
  name: string;
  icon: ReactNode;
  onClick: () => void;
}

export interface IModelGeneratorProps {
  editor: Editor;
}

export interface IModelGeneratorState {
  search: string;
}

export class ModelGenerator extends Component<IModelGeneratorProps, IModelGeneratorState> {
  public constructor(props: IModelGeneratorProps) {
    super(props);

    this.state = { search: "" };
  }

  public render(): ReactNode {
    const items: IPoiItem[] = [
      {
        name: "模型产生器",
        icon: <BiCube className="w-10 h-10" />,
        onClick: () => this._handleModelGenerator(),
      },
      {
        name: "货格布局器",
        icon: <LuLayoutGrid className="w-10 h-10" />,
        onClick: () => this._handleShelfLayout(),
      },
    ];

    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(this.state.search.toLowerCase())
    );

    return (
      <div className="flex flex-col w-full h-full">
        <div className="relative flex items-center px-2 py-2 bg-primary-foreground">
          <Input
            placeholder="搜索"
            value={this.state.search}
            onChange={(e) => this.setState({ search: e.currentTarget.value })}
            className={`
              w-full h-8 !border-none pl-7
              hover:border-border focus:border-border
              transition-all duration-300 ease-in-out
            `}
          />
          <FaMagnifyingGlass className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4" />
        </div>

        <div
          style={{
            gridTemplateRows: `repeat(auto-fill, ${120 * 1}px)`,
            gridTemplateColumns: `repeat(auto-fill, ${120 * 1}px)`,
          }}
          className="grid gap-4 justify-left w-full h-full p-5 overflow-y-auto"
        >
          {filtered.map((item) => (
            <div
              key={item.name}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData("poi-item", item.name);
              }}
              className={`
                flex flex-col items-center justify-center gap-2
                w-[120px] h-[120px] rounded-md cursor-pointer
                bg-card hover:bg-accent
                border border-border
                transition-all duration-300 ease-in-out
              `}
            >
              {item.icon}
              <span className="text-xs text-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  private _handleModelGenerator(): void {
    // TODO: 实现模型生成逻辑
  }

  private _handleShelfLayout(): void {
    // TODO: 实现货格布局逻辑
  }
}
