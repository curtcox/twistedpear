/**
 * Inline-SVG chart primitives for the published reports.
 *
 * No chart library, on purpose. These pages are built into a static site that
 * has to survive the licence, audit and bundle-size gates, and a dependency
 * whose whole job is to draw four shapes is not worth a place in that graph.
 *
 * Everything renders in both site themes by using VitePress's own CSS custom
 * properties for colour rather than fixed hex values.
 */

const PALETTE = [
  "var(--vp-c-brand-1)",
  "var(--vp-c-purple-1)",
  "var(--vp-c-green-1)",
  "var(--vp-c-yellow-1)",
  "var(--vp-c-red-1)",
  "var(--vp-c-indigo-1)",
];

export function paletteColor(index) {
  return PALETTE[index % PALETTE.length];
}

export function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function open(width, height, title, description) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="100%" role="img" aria-label="${escapeXml(title)}" ` +
    `style="max-width:100%;height:auto;font-family:var(--vp-font-family-base,sans-serif)">` +
    `<title>${escapeXml(title)}</title>` +
    (description ? `<desc>${escapeXml(description)}</desc>` : "")
  );
}

function label(x, y, text, options = {}) {
  const anchor = options.anchor ?? "start";
  const size = options.size ?? 11;
  const fill = options.fill ?? "var(--vp-c-text-2)";
  const weight = options.weight ? ` font-weight="${options.weight}"` : "";
  return (
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" ` +
    `fill="${fill}"${weight}>${escapeXml(text)}</text>`
  );
}

/**
 * Horizontal bars, one row per entry. The shape that answers "which of these
 * is the expensive one" in a single glance.
 *
 * @param {{label: string, value: number, note?: string, color?: string, href?: string}[]} rows
 */
export function barChart(rows, options = {}) {
  if (!rows || rows.length === 0) return "";

  const title = options.title ?? "Bar chart";
  const width = options.width ?? 860;
  const rowHeight = options.rowHeight ?? 24;
  const labelWidth = options.labelWidth ?? 300;
  const valueWidth = options.valueWidth ?? 110;
  const top = 8;
  const height = top * 2 + rows.length * rowHeight;
  const plot = Math.max(40, width - labelWidth - valueWidth - 16);
  const max = Math.max(1, ...rows.map((row) => row.value ?? 0));
  const format = options.format ?? ((value) => String(value));

  const bars = rows
    .map((row, index) => {
      const y = top + index * rowHeight;
      const barWidth = Math.max(1, ((row.value ?? 0) / max) * plot);
      const color = row.color ?? paletteColor(options.monochrome ? 0 : index);
      const name = truncate(row.label, options.labelChars ?? 44);
      const body =
        label(labelWidth - 8, y + rowHeight / 2 + 4, name, { anchor: "end", fill: "var(--vp-c-text-1)" }) +
        `<rect x="${labelWidth}" y="${y + 4}" width="${barWidth}" height="${rowHeight - 9}" ` +
        `rx="2" fill="${color}" opacity="0.85"><title>${escapeXml(`${row.label}: ${format(row.value)}${row.note ? ` — ${row.note}` : ""}`)}</title></rect>` +
        label(labelWidth + barWidth + 8, y + rowHeight / 2 + 4, format(row.value), {
          fill: "var(--vp-c-text-2)",
        });
      return row.href ? `<a href="${escapeXml(row.href)}">${body}</a>` : body;
    })
    .join("");

  return `${open(width, height, title, options.description)}${bars}</svg>`;
}

/**
 * A run's jobs on a shared timeline, queue wait shown separately from work.
 * This is the chart that shows whether a wide matrix is slow because the work
 * is slow or because half of it spent ten minutes waiting for a runner.
 *
 * @param {{label: string, startMs: number, queuedMs?: number, durationMs: number,
 *   ok?: boolean, note?: string}[]} rows
 */
export function ganttChart(rows, options = {}) {
  if (!rows || rows.length === 0) return "";

  const title = options.title ?? "Run timeline";
  const width = options.width ?? 860;
  const rowHeight = options.rowHeight ?? 16;
  const labelWidth = options.labelWidth ?? 280;
  const top = 24;
  const height = top + rows.length * rowHeight + 28;
  const plot = Math.max(40, width - labelWidth - 90);
  const span = Math.max(1, ...rows.map((row) => row.startMs + (row.durationMs ?? 0)));
  const x = (value) => labelWidth + (value / span) * plot;
  const format = options.format ?? ((value) => `${Math.round(value / 60000)}m`);

  const ticks = axisTicks(span)
    .map(
      (tick) =>
        `<line x1="${x(tick)}" y1="${top - 6}" x2="${x(tick)}" y2="${height - 26}" ` +
        `stroke="var(--vp-c-divider)" stroke-width="1"/>` +
        label(x(tick), top - 10, format(tick), { anchor: "middle" }),
    )
    .join("");

  const bars = rows
    .map((row, index) => {
      const y = top + index * rowHeight;
      const queued = Math.max(0, row.queuedMs ?? 0);
      const queuedWidth = (queued / span) * plot;
      const workWidth = Math.max(1, ((row.durationMs ?? 0) / span) * plot);
      const fill = row.ok === false ? "var(--vp-c-red-1)" : paletteColor(index);
      const tip = escapeXml(
        `${row.label}: ${format(row.durationMs ?? 0)}${queued ? `, ${format(queued)} queued` : ""}${row.note ? ` — ${row.note}` : ""}`,
      );
      return (
        label(labelWidth - 8, y + rowHeight - 4, truncate(row.label, 40), {
          anchor: "end",
          size: 10,
          fill: "var(--vp-c-text-1)",
        }) +
        (queuedWidth > 0.5
          ? `<rect x="${x(row.startMs) - queuedWidth}" y="${y + 3}" width="${queuedWidth}" ` +
            `height="${rowHeight - 7}" rx="1" fill="var(--vp-c-text-3)" opacity="0.35"/>`
          : "") +
        `<rect x="${x(row.startMs)}" y="${y + 3}" width="${workWidth}" height="${rowHeight - 7}" ` +
        `rx="1" fill="${fill}" opacity="0.85"><title>${tip}</title></rect>`
      );
    })
    .join("");

  const legend =
    `<rect x="${labelWidth}" y="${height - 16}" width="10" height="8" fill="var(--vp-c-text-3)" opacity="0.35"/>` +
    label(labelWidth + 15, height - 9, "queued", { size: 10 }) +
    `<rect x="${labelWidth + 70}" y="${height - 16}" width="10" height="8" fill="${paletteColor(0)}" opacity="0.85"/>` +
    label(labelWidth + 85, height - 9, "running", { size: 10 });

  return `${open(width, height, title, options.description)}${ticks}${bars}${legend}</svg>`;
}

/**
 * One or more series over run order. Trends are the whole point of keeping a
 * history: a gate that grew by four minutes over thirty runs is invisible in
 * any single run's report.
 *
 * @param {{name: string, points: {x: number, y: number, label?: string}[]}[]} series
 */
export function lineChart(series, options = {}) {
  const title = options.title ?? "Trend";
  const width = options.width ?? 860;
  const height = options.height ?? 240;
  const pad = { top: 16, right: 16, bottom: 30, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const points = series.flatMap((entry) => entry.points);
  if (points.length === 0) return "";
  const maxX = Math.max(...points.map((point) => point.x));
  const minX = Math.min(...points.map((point) => point.x));
  const maxY = Math.max(1, ...points.map((point) => point.y));
  const x = (value) => pad.left + (maxX === minX ? plotW : ((value - minX) / (maxX - minX)) * plotW);
  const y = (value) => pad.top + plotH - (value / maxY) * plotH;
  const format = options.format ?? ((value) => String(Math.round(value)));

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const value = maxY * fraction;
      return (
        `<line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}" ` +
        `stroke="var(--vp-c-divider)" stroke-width="1"/>` +
        label(pad.left - 8, y(value) + 4, format(value), { anchor: "end", size: 10 })
      );
    })
    .join("");

  const lines = series
    .map((entry, index) => {
      const color = entry.color ?? paletteColor(index);
      const path = entry.points
        .map((point, position) => `${position === 0 ? "M" : "L"}${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`)
        .join(" ");
      const dots = entry.points
        .map(
          (point) =>
            `<circle cx="${x(point.x).toFixed(1)}" cy="${y(point.y).toFixed(1)}" r="2.5" fill="${color}">` +
            `<title>${escapeXml(`${entry.name}: ${format(point.y)}${point.label ? ` (${point.label})` : ""}`)}</title></circle>`,
        )
        .join("");
      return `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>${dots}`;
    })
    .join("");

  const legend = series
    .map((entry, index) => {
      const cx = pad.left + index * 150;
      return (
        `<rect x="${cx}" y="${height - 14}" width="10" height="8" fill="${entry.color ?? paletteColor(index)}"/>` +
        label(cx + 15, height - 7, entry.name, { size: 10 })
      );
    })
    .join("");

  return `${open(width, height, title, options.description)}${grid}${lines}${legend}</svg>`;
}

/** A compact CPU/memory trace for one job, drawn from its sampler series. */
export function areaChart(points, options = {}) {
  const width = options.width ?? 420;
  const height = options.height ?? 90;
  if (points.length === 0) return "";
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = options.maxY ?? Math.max(1, ...points.map((point) => point.y));
  const x = (value) => (value / maxX) * (width - 8) + 4;
  const y = (value) => height - 14 - (value / maxY) * (height - 22);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(" ");
  const area = `${line} L${x(maxX).toFixed(1)},${height - 14} L${x(0).toFixed(1)},${height - 14} Z`;
  const color = options.color ?? paletteColor(0);
  return (
    `${open(width, height, options.title ?? "Trace", options.description)}` +
    `<path d="${area}" fill="${color}" opacity="0.18"/>` +
    `<path d="${line}" fill="none" stroke="${color}" stroke-width="1.5"/>` +
    label(4, 10, options.title ?? "", { size: 10, fill: "var(--vp-c-text-1)" }) +
    label(width - 4, 10, options.subtitle ?? "", { size: 10, anchor: "end" }) +
    `</svg>`
  );
}

function axisTicks(span) {
  const steps = 6;
  return Array.from({ length: steps + 1 }, (_, index) => (span / steps) * index);
}

function truncate(text, max) {
  const value = String(text ?? "");
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
