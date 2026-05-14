import { Component, ReactNode } from "react";

import { TransformNode } from "babylonjs";

import { onNodeModifiedObservable } from "../../../../tools/observables";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../ui/shadcn/ui/dialog";

const CELL_SIZE_OPTIONS = [50, 70, 90];
const LABEL_SIZE = 36;
const PAD = 16;
const EDGE_HIT = 7;
const HIGHLIGHT_W = 3;
const STORED_EDGE_W = 2;

type SelectMode = "cell" | "edge";
type OperationMode = "add" | "delete";

interface IHoveredEdge {
  type: "h" | "v";
  lineIndex: number;
  segIndex: number;
}

interface IEdgeData {
  type: "h" | "v";
  start: { x: number; y: number };
  length: number;
}

// ---- Conversion helpers (segment ↔ compact) ----

function edgeDataToSegments(edges: IEdgeData[]): IHoveredEdge[] {
  const segs: IHoveredEdge[] = [];
  for (const e of edges) {
    for (let i = 0; i < e.length; i++) {
      if (e.type === "h") {
        segs.push({ type: "h", lineIndex: e.start.y, segIndex: e.start.x + i });
      } else {
        segs.push({ type: "v", lineIndex: e.start.x, segIndex: e.start.y + i });
      }
    }
  }
  return segs;
}

function segmentsToEdgeData(segs: IHoveredEdge[]): IEdgeData[] {
  const groups = new Map<string, number[]>();
  for (const s of segs) {
    const key = `${s.type}-${s.lineIndex}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s.segIndex);
  }

  const result: IEdgeData[] = [];
  for (const [key, indices] of groups) {
    const [type, liStr] = key.split("-");
    const li = parseInt(liStr);
    indices.sort((a, b) => a - b);

    let runStart = indices[0];
    let runLen = 1;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] === runStart + runLen) {
        runLen++;
      } else {
        result.push(_segToEdge(type as "h" | "v", li, runStart, runLen));
        runStart = indices[i];
        runLen = 1;
      }
    }
    result.push(_segToEdge(type as "h" | "v", li, runStart, runLen));
  }
  return result;
}

function _segToEdge(type: "h" | "v", li: number, segStart: number, len: number): IEdgeData {
  if (type === "h") {
    return { type: "h", start: { x: segStart, y: li }, length: len };
  } else {
    return { type: "v", start: { x: li, y: segStart }, length: len };
  }
}

function makeDefaultEdges(rows: number, columns: number): IEdgeData[] {
  const edges: IEdgeData[] = [];
  for (let y = 0; y <= rows; y++) {
    edges.push({ type: "h", start: { x: 0, y }, length: columns });
  }
  for (let x = 0; x <= columns; x++) {
    edges.push({ type: "v", start: { x, y: 0 }, length: rows });
  }
  return edges;
}

export interface IShelfLayoutProps {
  object: TransformNode;
}

export interface IShelfLayoutState {
  layoutDialogOpen: boolean;
  cellSize: number;
  selectMode: SelectMode;
  operationMode: OperationMode;
  hoveredEdge: IHoveredEdge | null;
  workingEdges: IHoveredEdge[];
}

export class ShelfLayout extends Component<IShelfLayoutProps, IShelfLayoutState> {
  public constructor(props: IShelfLayoutProps) {
    super(props);

    this.state = {
      layoutDialogOpen: false,
      cellSize: 70,
      selectMode: "cell",
      operationMode: "add",
      hoveredEdge: null,
      workingEdges: [],
    };
  }

  public render(): ReactNode {
    return (
      <EditorInspectorSectionField title="货格布局">
        <EditorInspectorNumberField
          label="行"
          object={this._ensureLayout()}
          property="rows"
          min={1}
          max={1000}
          step={1}
          onChange={() => this._onRowsColsChanged()}
        />
        <EditorInspectorNumberField
          label="列"
          object={this._ensureLayout()}
          property="columns"
          min={1}
          max={1000}
          step={1}
          onChange={() => this._onRowsColsChanged()}
        />
        <div className="flex flex-col gap-2 px-2 py-2">
          <Button variant="outline" onClick={() => this._openDialog()}>
            编辑布局
          </Button>
        </div>

        <Dialog open={this.state.layoutDialogOpen} onOpenChange={(open) => this.setState({ layoutDialogOpen: open })}>
          <DialogContent className="max-w-6xl max-h-[92vh]">
            <DialogHeader>
              <DialogTitle>货格布局</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">显示尺寸:</span>
                {CELL_SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    variant={this.state.cellSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => this.setState({ cellSize: size })}
                  >
                    {size}px
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">选择:</span>
                <Button
                  variant={this.state.selectMode === "cell" ? "default" : "outline"}
                  size="sm"
                  onClick={() => this.setState({ selectMode: "cell", hoveredEdge: null })}
                >
                  格子
                </Button>
                <Button
                  variant={this.state.selectMode === "edge" ? "default" : "outline"}
                  size="sm"
                  onClick={() => this.setState({ selectMode: "edge", hoveredEdge: null })}
                >
                  边
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">操作:</span>
                <Button
                  variant={this.state.operationMode === "add" ? "default" : "outline"}
                  size="sm"
                  onClick={() => this.setState({ operationMode: "add" })}
                >
                  增加
                </Button>
                <Button
                  variant={this.state.operationMode === "delete" ? "default" : "outline"}
                  size="sm"
                  onClick={() => this.setState({ operationMode: "delete" })}
                >
                  删除
                </Button>
              </div>
            </div>

            <div className="overflow-auto rounded-md max-h-[60vh]">
              {this._renderGrid()}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => this.setState({ layoutDialogOpen: false })}>取消</Button>
              <Button onClick={() => this._saveDialog()}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </EditorInspectorSectionField>
    );
  }

  private _ensureLayout(): { rows: number; columns: number; [key: string]: any } {
    if (!this.props.object.metadata.layout) {
      this.props.object.metadata.layout = { rows: 1, columns: 1 };
    }
    return this.props.object.metadata.layout;
  }

  private _onRowsColsChanged(): void {
    const layout = this._ensureLayout();
    // Reset edges to default when grid dimensions change
    layout.edges = makeDefaultEdges(layout.rows, layout.columns);
    onNodeModifiedObservable.notifyObservers(this.props.object);
    this.forceUpdate();
  }

  private _openDialog(): void {
    const layout = this._ensureLayout();
    let compact: IEdgeData[] = Array.isArray(layout.edges) && layout.edges.length > 0
      ? layout.edges as IEdgeData[]
      : makeDefaultEdges(layout.rows, layout.columns);
    this.setState({
      layoutDialogOpen: true,
      hoveredEdge: null,
      workingEdges: edgeDataToSegments(compact),
    });
  }

  private _saveDialog(): void {
    const layout = this._ensureLayout();
    layout.edges = segmentsToEdgeData(this.state.workingEdges);
    onNodeModifiedObservable.notifyObservers(this.props.object);
    this.setState({ layoutDialogOpen: false });
  }

  private _edgeMatch(a: IHoveredEdge, b: IHoveredEdge): boolean {
    return a.type === b.type && a.lineIndex === b.lineIndex && a.segIndex === b.segIndex;
  }

  private _handleEdgeClick(edge: IHoveredEdge): void {
    const working = [...this.state.workingEdges];

    const targets = this.state.selectMode === "edge"
      ? this._getLineEdges(edge)
      : [edge];

    if (this.state.operationMode === "add") {
      for (const t of targets) {
        if (!working.some((e) => this._edgeMatch(e, t))) {
          working.push({ ...t });
        }
      }
    } else {
      const filtered = working.filter(
        (e) => !targets.some((t) => this._edgeMatch(e, t))
      );
      this.setState({ workingEdges: filtered });
      return;
    }

    this.setState({ workingEdges: working });
  }

  private _getLineEdges(edge: IHoveredEdge): IHoveredEdge[] {
    const layout = this._ensureLayout();
    if (edge.type === "h") {
      return Array.from({ length: layout.columns }, (_, c) => ({
        type: "h" as const,
        lineIndex: edge.lineIndex,
        segIndex: c,
      }));
    } else {
      return Array.from({ length: layout.rows }, (_, r) => ({
        type: "v" as const,
        lineIndex: edge.lineIndex,
        segIndex: r,
      }));
    }
  }

  private _renderGrid(): ReactNode {
    const layout = this._ensureLayout();
    const { rows, columns } = layout;
    const cs = this.state.cellSize;
    const { selectMode, operationMode, hoveredEdge: hovered, workingEdges } = this.state;
    const hlColor = operationMode === "add" ? "rgba(74,222,128,0.55)" : "rgba(248,113,113,0.55)";

    const gridW = columns * cs;
    const gridH = rows * cs;

    const els: ReactNode[] = [];

    const toX = (c: number) => PAD + c * cs;
    const toY = (r: number) => PAD + (rows - 1 - r) * cs; // r=0 bottom

    // ---- Cell backgrounds ----
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        els.push(
          <rect
            key={`bg-${r}-${c}`}
            x={toX(c)}
            y={toY(r)}
            width={cs}
            height={cs}
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />
        );
      }
    }

    // ---- Stored edges (thick white) from working copy ----
    for (const e of workingEdges) {
      if (e.type === "h") {
        const y = PAD + gridH - e.lineIndex * cs;
        els.push(
          <rect key={`se-h-${e.lineIndex}-${e.segIndex}`} x={toX(e.segIndex)} y={y - STORED_EDGE_W / 2} width={cs} height={STORED_EDGE_W} fill="white" style={{ pointerEvents: "none" }} />
        );
      } else {
        const x = toX(e.lineIndex);
        els.push(
          <rect key={`se-v-${e.lineIndex}-${e.segIndex}`} x={x - STORED_EDGE_W / 2} y={toY(e.segIndex)} width={STORED_EDGE_W} height={cs} fill="white" style={{ pointerEvents: "none" }} />
        );
      }
    }

    // ---- Edge hit targets ----
    for (let li = 0; li <= rows; li++) {
      const cy = PAD + gridH - li * cs;
      for (let c = 0; c < columns; c++) {
        const edge: IHoveredEdge = { type: "h", lineIndex: li, segIndex: c };
        els.push(
          <rect
            key={`eh-${li}-${c}`}
            x={toX(c)}
            y={cy - EDGE_HIT / 2}
            width={cs}
            height={EDGE_HIT}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => this.setState({ hoveredEdge: edge })}
            onMouseLeave={() => this.setState({ hoveredEdge: null })}
            onClick={() => this._handleEdgeClick(edge)}
          />
        );
      }
    }
    for (let li = 0; li <= columns; li++) {
      const cx = toX(li);
      for (let r = 0; r < rows; r++) {
        const edge: IHoveredEdge = { type: "v", lineIndex: li, segIndex: r };
        els.push(
          <rect
            key={`ev-${li}-${r}`}
            x={cx - EDGE_HIT / 2}
            y={toY(r)}
            width={EDGE_HIT}
            height={cs}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => this.setState({ hoveredEdge: edge })}
            onMouseLeave={() => this.setState({ hoveredEdge: null })}
            onClick={() => this._handleEdgeClick(edge)}
          />
        );
      }
    }

    // ---- Highlight layer ----
    if (hovered && selectMode === "cell") {
      if (hovered.type === "h") {
        const y = PAD + gridH - hovered.lineIndex * cs;
        els.push(
          <rect key="hl" x={toX(hovered.segIndex)} y={y - HIGHLIGHT_W / 2} width={cs} height={HIGHLIGHT_W} fill={hlColor} style={{ pointerEvents: "none" }} />
        );
      } else {
        const x = toX(hovered.lineIndex);
        els.push(
          <rect key="hl" x={x - HIGHLIGHT_W / 2} y={toY(hovered.segIndex)} width={HIGHLIGHT_W} height={cs} fill={hlColor} style={{ pointerEvents: "none" }} />
        );
      }
    }
    if (hovered && selectMode === "edge") {
      if (hovered.type === "h") {
        const y = PAD + gridH - hovered.lineIndex * cs;
        els.push(
          <rect key="hl" x={PAD} y={y - HIGHLIGHT_W / 2} width={gridW} height={HIGHLIGHT_W} fill={hlColor} style={{ pointerEvents: "none" }} />
        );
      } else {
        const x = toX(hovered.lineIndex);
        els.push(
          <rect key="hl" x={x - HIGHLIGHT_W / 2} y={PAD} width={HIGHLIGHT_W} height={gridH} fill={hlColor} style={{ pointerEvents: "none" }} />
        );
      }
    }

    // ---- Row label items (sticky left, rendered as HTML) ----
    const rowLabels: ReactNode[] = [];
    for (let i = rows - 1; i >= 0; i--) {
      rowLabels.push(
        <div
          key={`rl-${i}`}
          style={{
            height: cs,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: "bold",
            color: "hsl(var(--foreground))",
          }}
        >
          {i + 1}
        </div>
      );
    }

    // ---- Column label items (sticky bottom, rendered as HTML) ----
    const colLabels: ReactNode[] = [];
    for (let c = 0; c < columns; c++) {
      colLabels.push(
        <div
          key={`cl-${c}`}
          style={{
            width: cs,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: "bold",
            color: "hsl(var(--foreground))",
          }}
        >
          {c + 1}
        </div>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${LABEL_SIZE}px ${PAD + gridW + PAD}px`,
          gridTemplateRows: `${PAD + gridH + PAD}px ${LABEL_SIZE}px`,
          width: "max-content",
          minWidth: "100%",
        }}
      >
        <div style={{ gridRow: "1", gridColumn: "2" }}>
          <svg width={PAD + gridW + PAD} height={PAD + gridH + PAD}>
            {els}
          </svg>
        </div>

        <div
          style={{
            gridRow: "1",
            gridColumn: "1",
            position: "sticky",
            left: 0,
            zIndex: 2,
            background: "hsl(var(--background))",
            paddingTop: PAD,
          }}
        >
          {rowLabels}
        </div>

        <div
          style={{
            gridRow: "2",
            gridColumn: "2",
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            background: "hsl(var(--background))",
            display: "flex",
            paddingLeft: PAD,
          }}
        >
          {colLabels}
        </div>

        <div
          style={{
            gridRow: "2",
            gridColumn: "1",
            position: "sticky",
            left: 0,
            bottom: 0,
            zIndex: 3,
            background: "hsl(var(--background))",
          }}
        />
      </div>
    );
  }
}
