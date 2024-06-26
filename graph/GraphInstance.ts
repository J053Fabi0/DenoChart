import { CanvasInstance } from "../config/index.ts";
import { normalize, max, background, drawTextWithFont } from "../utils/index.ts";

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GraphOptions {
  // Canvas Width & Height
  width: number;
  height: number;
  backgroundColor: RGBA;

  // Graph Text
  titleText: string;
  xAxisText: string;
  yAxisText: string;

  /** Y-Max Normalized Value */
  yMax: number;

  // Graph Outer-Padding
  yPadding: number;
  xPadding: number;

  // Bar Config
  bar_width: number;
  bar_spacing: number;

  // Graph Segements
  graphSegments_Y: number;
  graphSegments_X: number;

  // Text Color
  titleColor: string;
  xTextColor: string;
  yTextColor: string;
  /** Defaults to 10pt */
  yTextSize: number;

  // Segmentation Color
  xSegmentColor: string;
  ySegmentColor: string;

  // Graph Values
  graphValuePrecision: number; // Rounds floating-point values to given nth number

  // DEBUG: Options
  verbose: boolean; // Enable/Disable Logging
}

export interface BarEntry {
  val: number;
  label?: string;
  color: string;
  /** If null, it won't show it. If undefined, it will show the value. */
  valueLabel?: string | null;
}

export class Graph {
  // Graph Offsets
  private _y_offset = 30;
  private _x_offset = 30;
  private _y_padding = 30;
  private _x_padding = 50;

  private _entries: BarEntry[] = [];

  // Graph Configuration
  private _options: GraphOptions;

  /**
   * Constructs Graph Configuration
   * @param config (Optional) Graph Configuration
   */
  constructor(config?: Partial<GraphOptions>) {
    // Setup Default Segments & Max Values
    const graphSegments_Y = 10;

    // Configure Graph
    this._options = {
      height: (config && config.height) ?? 480,
      width: (config && config.width) ?? 720,
      backgroundColor: (config && config.backgroundColor) ?? {
        r: 50,
        g: 50,
        b: 50,
        a: 0.5,
      },

      titleText: (config && config.titleText) ?? "title",
      xAxisText: (config && config.xAxisText) ?? "X-Axis",
      yAxisText: (config && config.yAxisText) ?? "Y-Axis",

      yMax: (config && config.yMax) ?? -1,

      yPadding: (config && config.yPadding) ?? 0,
      xPadding: (config && config.xPadding) ?? 0,

      bar_width: (config && config.bar_width) ?? 10,
      bar_spacing: (config && config.bar_spacing) ?? 5,

      graphSegments_X: (config && config.graphSegments_X) ?? 10,
      graphSegments_Y: (config && config.graphSegments_Y) ?? graphSegments_Y,

      titleColor: (config && config.titleColor) ?? "rgb(255,255,255)",
      xTextColor: (config && config.xTextColor) ?? "rgb(255,255,255)",
      yTextColor: (config && config.yTextColor) ?? "rgb(255,255,255)",
      yTextSize: (config && config.yTextSize) ?? 10,

      xSegmentColor: (config && config.xSegmentColor) ?? "rgb(255,255,255)",
      ySegmentColor: (config && config.ySegmentColor) ?? "rgb(255,255,255)",

      graphValuePrecision: (config && config.graphValuePrecision) ?? 2,

      verbose: (config && config.verbose) ?? false,
    };

    // Apply Graph Padding
    this._x_padding += this._options.xPadding;
    this._y_padding += this._options.yPadding;
    this._x_offset += this._options.xPadding;
    this._y_offset += this._options.yPadding;

    // Initialize Canvas Instance if have NOT already
    if (!CanvasInstance.ready()) {
      CanvasInstance.init(this._options.width, this._options.height);

      if (this._options.verbose)
        console.log(`Initialized Canvas Instance W[${this._options.width}] H[${this._options.height}]`);
    }

    if (this._options.verbose) console.log("Create Graph with Options:", this._options);
  }

  /**
   * Adds given Bar entry to Graph
   * @param entry Entry to add to graph
   */
  public add(entry: BarEntry): void {
    this._entries.push(entry);
  }

  /**
   * Internal: Draws Graph outline
   */
  private _draw_graph_outline() {
    const { ctx, HEIGHT, WIDTH } = CanvasInstance;

    // CTX Config
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Drawing Style Config
    ctx.save();
    ctx.strokeStyle = this._options.titleColor;
    ctx.fillStyle = this._options.titleColor;
    ctx.lineWidth = 1.5;

    // Graph Title
    if (this._options.titleText)
      drawTextWithFont(this._options.titleText, WIDTH / 2 - 30, this._y_offset, "12pt Cochin");

    // X-Axis
    ctx.strokeStyle = this._options.xTextColor;
    ctx.fillStyle = this._options.xTextColor;
    if (this._options.xAxisText)
      ctx.fillText(this._options.xAxisText, WIDTH / 2 - 10, HEIGHT - this._y_offset / 2 + 10);

    ctx.beginPath();
    ctx.lineTo(this._x_padding, HEIGHT - this._y_padding);
    ctx.lineTo(this._x_padding, this._y_padding);
    ctx.stroke();
    ctx.closePath();

    // Y-Axis
    ctx.strokeStyle = this._options.yTextColor;
    ctx.fillStyle = this._options.yTextColor;
    if (this._options.yAxisText) ctx.fillText(this._options.yAxisText, this._x_offset / 2 - 8, HEIGHT / 2);

    ctx.beginPath();
    ctx.lineTo(this._x_padding, HEIGHT - this._y_padding);
    ctx.lineTo(WIDTH - this._x_padding, HEIGHT - this._y_padding);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }

  /**
   * Internal: Draws graph segments
   */
  private _draw_graph_segments() {
    const { ctx, HEIGHT, WIDTH } = CanvasInstance;
    const { graphSegments_X, graphSegments_Y, graphValuePrecision } = this._options;

    // Evaluate yMax if selected
    if (this._options.yMax === -1) {
      this._options.yMax = max(this._entries.map((elt) => elt.val));
      if (this._options.verbose) console.log("yMax Evaluated to: ", this._options.yMax);
    }

    // Y-Axis Segmentations
    const y_height_px = HEIGHT / graphSegments_Y;
    const maxY_segment = y_height_px * (graphSegments_Y - 2);

    for (let i = 0; i < graphSegments_Y - 1; i++) {
      const Y = HEIGHT - y_height_px * i - this._y_padding;

      ctx.fillStyle = "#ECF0F1";
      ctx.strokeStyle = "#ECF0F1";
      ctx.beginPath();
      ctx.arc(this._x_padding, Y, 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // X Value Text (Index)
      ctx.fillStyle = this._options.ySegmentColor;
      ctx.strokeStyle = this._options.ySegmentColor;

      const yVal: number = normalize((HEIGHT - this._y_padding - Y) * this._options.yMax, 0, maxY_segment);
      const yValStr: string = yVal % 1 === 0 ? yVal.toString() : yVal.toFixed(graphValuePrecision);
      const offset: number = 10 + yValStr.length * 5.5;

      ctx.fillText(yValStr, this._x_padding - offset, Y + 3);
    }

    // X-Axis Segmentations
    const X_SEGMENTS = (WIDTH - this._x_padding) / graphSegments_X;
    for (let i = 0; i < graphSegments_X - 1; i++) {
      const X = this._x_padding + X_SEGMENTS * i;

      ctx.fillStyle = "#ECF0F1";
      ctx.strokeStyle = "#ECF0F1";
      ctx.beginPath();
      ctx.arc(X, HEIGHT - this._y_padding, 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // X Value Text (Index)
      const entry = this._entries[i];
      ctx.fillStyle = this._options.xSegmentColor;
      ctx.strokeStyle = this._options.xSegmentColor;
      ctx.font = this._options.yTextSize + "px Cochin";

      if (entry?.label !== "") {
        const entryFloatVal = (entry && entry.label !== undefined && Number.parseFloat(entry.label)) || NaN;
        ctx.fillText(
          (
            (entry &&
              entry.label !== undefined && // Set fixed floating point decimal IF parsable float
              (isNaN(entryFloatVal)
                ? entry.label
                : !(entryFloatVal % 1) // Only set fixed precision for Floating-point values
                ? entryFloatVal
                : entryFloatVal.toFixed(graphValuePrecision))) ||
            i
          ).toString(),
          X,
          HEIGHT - this._y_offset + 12
        );
      }
    }
  }

  /**
   * Internal: Draws graph bar entries
   */
  private _draw_bars() {
    const { ctx, HEIGHT, WIDTH } = CanvasInstance;
    const { bar_width, graphSegments_X, graphSegments_Y, graphValuePrecision, yMax } = this._options;

    ctx.save();

    // Find max bar value to map based on yMax
    const Y_SEGMENTS = HEIGHT / graphSegments_Y;
    const maxY_segment = Y_SEGMENTS * (graphSegments_Y - 2);

    // Space out each Entry to given Segments
    const X_SEGMENTS = (WIDTH - this._x_padding) / graphSegments_X;
    for (let i = 0; i < graphSegments_X; i++) {
      // Constrain to # of entries
      if (i >= this._entries.length) break;

      const entry = this._entries[i];
      const { val: y, color, valueLabel } = entry;

      ctx.fillStyle = color;
      ctx.beginPath();

      // Max X & Y Points
      const X = this._x_padding + X_SEGMENTS * i;
      const Y = normalize(y, 0, yMax) * maxY_segment;

      ctx.fillRect(X, HEIGHT - this._y_offset - Y, bar_width, Y);
      ctx.closePath();

      // Y Value text (Value)
      const val = y % 1 !== 0 ? y.toFixed(graphValuePrecision) : y;
      if (valueLabel !== null) ctx.fillText(valueLabel ?? val.toString(), X + 5, HEIGHT - this._y_offset - Y - 10);
    }

    ctx.restore();
  }

  /**
   * Draws graph with entries to Canvas Context
   */
  public draw() {
    const { r, g, b, a } = this._options.backgroundColor;
    background(r, g, b, a);

    this._draw_bars();
    this._draw_graph_outline();
    this._draw_graph_segments();
  }

  /**
   * Saves graph as png to given path
   * @param imagePath Path of image to save to
   */
  public save(imagePath: string) {
    const { canvas } = CanvasInstance;
    const imageBuffer = canvas.toBuffer();
    Deno.writeFileSync(imagePath, imageBuffer);

    if (this._options.verbose) console.log(`Graph save to '${imagePath}'`);
  }

  /**
   * @returns Image buffer
   */
  public toBuffer(): Uint8Array {
    const { canvas } = CanvasInstance;
    return canvas.toBuffer();
  }
}
