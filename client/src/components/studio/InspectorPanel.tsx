import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Copy,
  Eraser,
  Eye,
  Info,
  Layers2,
  RefreshCw,
  WandSparkles,
} from "lucide-react";
import type { StudioTool } from "@/components/workspace/canvas/PreviewCanvas";
import { useImageDimensions } from "@/hooks/useImageDimensions";
import { formatBytes } from "@/lib/format";

interface InspectorPanelProps {
  tool: StudioTool;
  svg: string | null;
  download: () => void;
  process: () => void;
  processing: boolean;
  removedBgUrl: string | null;
  downloadRemovedBg: () => void;
  removeBackground: () => void;
  removingBg: boolean;
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/** Panel derecho "INSPECTOR" del Studio: cuando la herramienta es
 * "vectorize" muestra capas, propiedades y codigo del SVG (solo
 * lectura por ahora, sin edicion real de capas). Cuando es
 * "remove-bg" muestra las propiedades del PNG resultante. Las
 * acciones de generar/descargar viven aqui abajo, no en el lienzo. */
export default function InspectorPanel({
  tool,
  svg,
  download,
  process,
  processing,
  removedBgUrl,
  downloadRemovedBg,
  removeBackground,
  removingBg,
}: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);
  const pngDims = useImageDimensions(removedBgUrl);
  const [pngSize, setPngSize] = useState<number | null>(null);

  useEffect(() => {
    if (!removedBgUrl) {
      setPngSize(null);
      return;
    }
    fetch(removedBgUrl)
      .then(r => r.blob())
      .then(b => setPngSize(b.size));
  }, [removedBgUrl]);

  const pathCount = svg ? countMatches(svg, /<path\b/g) : 0;
  const fillCount = svg
    ? new Set(svg.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? []).size
    : 0;
  const dims = svg?.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const width = dims ? Math.round(Number(dims[1])) : null;
  const height = dims ? Math.round(Number(dims[2])) : null;
  const sizeLabel = svg ? formatBytes(new Blob([svg]).size) : "—";

  const layers = [
    { label: "Trazados", count: pathCount },
    { label: "Rellenos", count: fillCount },
    { label: "Grupo Principal", count: svg ? 1 : 0 },
  ];

  const copy = () => {
    if (!svg) return;
    navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="flex min-w-0 flex-col border-t border-[#E3E2D9] bg-[#FAF9F5] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div className="font-technical mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-[#0C1330]">
        <Layers2 size={14} strokeWidth={2.5} /> Inspector
      </div>
      <div className="mb-4 hairline" />

      {tool === "vectorize" ? (
        <>
          <div className="font-technical mb-2 text-[10px] font-black uppercase tracking-[.15em] text-[#9AA1B2]">
            Capas
          </div>
          <div className="mb-4 space-y-1.5 text-sm">
            {layers.map(({ label, count }) => (
              <div
                key={label}
                className="flex items-center justify-between border border-[#E3E2D9] bg-white px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[#0C1330]">
                  <Eye size={14} className="text-[#9AA1B2]" /> {label}
                </span>
                <span className="font-technical text-[#7A8194]">{count}</span>
              </div>
            ))}
          </div>

          <div className="my-4 hairline" />

          <div className="font-technical mb-2 text-[10px] font-black uppercase tracking-[.15em] text-[#9AA1B2]">
            Propiedades
          </div>
          <div className="font-technical mb-4 grid grid-cols-2 gap-y-2 text-[13px] font-bold">
            <span className="text-[#7A8194]">Ancho</span>
            <span className="text-right text-[#0C1330]">{width ?? "—"}</span>
            <span className="text-[#7A8194]">Alto</span>
            <span className="text-right text-[#0C1330]">{height ?? "—"}</span>
            <span className="text-[#7A8194]">Nodos</span>
            <span className="text-right text-[#0C1330]">—</span>
            <span className="text-[#7A8194]">Tamaño SVG</span>
            <span className="text-right text-[#0C1330]">{sizeLabel}</span>
          </div>

          <div className="my-4 hairline" />

          <div className="min-w-0 border border-[#E3E2D9] bg-white">
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="font-technical text-[10px] font-black uppercase tracking-[.15em] text-[#9AA1B2]">
                Código SVG
              </span>
              <button
                onClick={copy}
                disabled={!svg}
                aria-label="Copiar código SVG"
                className="text-[#7A8194] hover:text-[#0C1330] disabled:opacity-40"
              >
                {copied ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <Copy size={14} strokeWidth={2.5} />
                )}
              </button>
            </div>
            <div className="hairline" />
            <pre className="font-technical max-h-[180px] overflow-auto whitespace-pre-wrap break-all p-2.5 text-[11px] font-bold leading-relaxed text-[#5A6178]">
              {svg
                ? svg.slice(0, 800) + (svg.length > 800 ? "\n…" : "")
                : "Genera una preview para ver el código."}
            </pre>
          </div>

          {!svg && (
            <div className="mt-4 flex items-start gap-2 border border-[#E3E2D9] bg-white p-3 text-xs leading-relaxed text-[#7A8194]">
              <Info size={14} className="mt-0.5 shrink-0 text-[#1652F5]" />
              Genera una preview para ver capas, propiedades y código.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={process}
              className="button-press flex w-full items-center justify-center gap-2 bg-[#D8F646] px-4 py-3.5 text-sm font-bold uppercase tracking-[.04em] text-[#0C1330] hover:bg-[#C6E52E]"
            >
              {processing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <WandSparkles size={16} />
              )}{" "}
              {processing ? "Trazando…" : "Convertir a SVG"}
            </button>
            <button
              onClick={download}
              disabled={!svg}
              className="button-press flex w-full items-center justify-center gap-2 bg-[#1652F5] px-4 py-3.5 text-sm font-bold uppercase tracking-[.04em] text-white hover:bg-[#0B3ECB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={16} /> Descargar SVG
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="font-technical mb-2 text-[10px] font-black uppercase tracking-[.15em] text-[#9AA1B2]">
            Propiedades
          </div>
          <div className="font-technical mb-5 grid grid-cols-2 gap-y-2 text-[13px] font-bold">
            <span className="text-[#7A8194]">Ancho</span>
            <span className="text-right text-[#0C1330]">
              {pngDims?.w ?? "—"}
            </span>
            <span className="text-[#7A8194]">Alto</span>
            <span className="text-right text-[#0C1330]">
              {pngDims?.h ?? "—"}
            </span>
            <span className="text-[#7A8194]">Formato</span>
            <span className="text-right text-[#0C1330]">
              {removedBgUrl ? "PNG" : "—"}
            </span>
            <span className="text-[#7A8194]">Tamaño</span>
            <span className="text-right text-[#0C1330]">
              {pngSize !== null ? formatBytes(pngSize) : "—"}
            </span>
          </div>

          {!removedBgUrl && (
            <div className="flex items-start gap-2 border border-[#E3E2D9] bg-white p-3 text-xs font-bold leading-relaxed text-[#7A8194]">
              <Info
                size={14}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0 text-[#1652F5]"
              />
              Quita el fondo para ver las propiedades del resultado.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={removeBackground}
              className="button-press flex w-full items-center justify-center gap-2 bg-[#D8F646] px-4 py-3.5 text-sm font-bold uppercase tracking-[.04em] text-[#0C1330] hover:bg-[#C6E52E]"
            >
              {removingBg ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Eraser size={16} />
              )}{" "}
              {removingBg ? "Quitando…" : "Quitar fondo"}
            </button>
            <button
              onClick={downloadRemovedBg}
              disabled={!removedBgUrl}
              className="button-press flex w-full items-center justify-center gap-2 bg-[#1652F5] px-4 py-3.5 text-sm font-bold uppercase tracking-[.04em] text-white hover:bg-[#0B3ECB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={16} /> Descargar PNG
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
