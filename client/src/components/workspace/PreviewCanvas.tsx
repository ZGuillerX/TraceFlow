import { useEffect, useState, type DragEvent, type RefObject } from "react";
import {
  ChevronDown,
  Hand,
  ImagePlus,
  Maximize,
  MousePointer2,
  Palette,
  RefreshCw,
  X,
} from "lucide-react";
import CompareSlider from "@/components/studio/CompareSlider";
import ColorInput from "./ColorInput";
import RangeSlider from "./RangeSlider";
import type { DetectedColor } from "@/lib/recolor";

export type StudioTool = "vectorize" | "remove-bg";

interface PreviewCanvasProps {
  input: RefObject<HTMLInputElement | null>;
  tool: StudioTool;
  file: File | null;
  svg: string | null;
  displaySvg: string | null;
  mode: "preview" | "paths";
  setMode: (mode: "preview" | "paths") => void;
  choose: () => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFile: (file: File | undefined) => void;
  onRemove: () => void;
  processing: boolean;
  currentStage: string | null;
  cancel: () => void;
  removingBg: boolean;
  removedBgUrl: string | null;
  detectedColors: DetectedColor[];
  colorOverrides: Record<string, string>;
  setColorOverride: (id: string, hex: string) => void;
}

const MAX_VISIBLE_SWATCHES = 6;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STAGE_LABELS: Record<string, string> = {
  original: "Preparando imagen",
  ampliada: "Ampliando detalle",
  sin_fondo: "Quitando fondo",
  colores: "Simplificando colores",
  bordes_suaves: "Suavizando bordes",
  final: "Trazando curvas",
};

// las etapas que puede mandar el backend difieren segun el modo (con o
// sin quitar fondo, ver run_vectorize_stages en vectorize_service.py),
// pero en ambos casos son 5 pasos que avanzan de forma monotona hasta
// "final" -- no hace falta saber el modo de antemano para calcular el %.
const STAGE_PROGRESS: Record<string, number> = {
  original: 10,
  ampliada: 30,
  sin_fondo: 55,
  colores: 70,
  bordes_suaves: 85,
  final: 100,
};

/** Lienzo de preview del Studio: dropzone (drag&drop + clic), chip de
 * la fuente cargada junto al titulo, barra de progreso en vivo
 * mientras vectoriza (una etapa del pipeline por evento SSE), vista
 * previa real de la imagen antes de convertir, el comparador
 * Original/SVG una vez listo, y los colores detectados. */
export default function PreviewCanvas({
  input,
  tool,
  file,
  svg,
  displaySvg,
  mode,
  setMode,
  choose,
  onFile,
  onDropFile,
  onRemove,
  processing,
  currentStage,
  cancel,
  removingBg,
  removedBgUrl,
  detectedColors,
  colorOverrides,
  setColorOverride,
}: PreviewCanvasProps) {
  const progress = currentStage ? (STAGE_PROGRESS[currentStage] ?? 0) : 0;
  const visibleSwatches = detectedColors.slice(0, MAX_VISIBLE_SWATCHES);
  const remainingCount = detectedColors.length - visibleSwatches.length;
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  // decorativos: la herramienta activa y el zoom se muestran y se
  // mueven, pero el lienzo no tiene pan/zoom real todavia.
  const [zoomTool, setZoomTool] = useState<"hand" | "fit">("hand");
  const [zoom, setZoom] = useState(50);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDims(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // processing bloquea el drop: soltar una imagen nueva a medio
  // trazado interrumpiria el proceso en curso de forma confusa (para
  // reemplazar hay que cancelar primero).
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (processing) return;
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (processing) return;
    onDropFile(e.dataTransfer.files[0]);
  };

  return (
    <section className="border border-[#DEDDD3] bg-white p-4 shadow-[0_18px_50px_rgba(12,19,48,.06)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
            <MousePointer2 size={15} className="text-[#1652F5]" /> Lienzo de
            preview
          </div>
          {file && (
            <div className="flex items-center gap-2 border border-[#DEDDD3] bg-[#FAF9F5] py-1 pl-1 pr-2">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt=""
                  className="checkerboard h-7 w-7 shrink-0 border border-[#E3E2D9] object-cover"
                />
              )}
              <span className="max-w-[140px] truncate text-[11px] font-bold text-[#0C1330]">
                {file.name}
              </span>
              <span className="font-technical whitespace-nowrap text-[10px] text-[#7A8194]">
                {dims ? `${dims.w}×${dims.h}` : "…"} · {formatBytes(file.size)}
              </span>
              <button
                onClick={onRemove}
                disabled={processing}
                aria-label="Quitar imagen"
                className="text-[#7A8194] hover:text-[#0C1330] disabled:opacity-40"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        {tool === "vectorize" && (
          <div className="flex border border-[#DEDDD3] bg-[#F2F3F5] p-1">
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1.5 text-xs font-bold ${mode === "preview" ? "bg-white text-[#0C1330] shadow-sm" : "text-[#7A8194]"}`}
            >
              Vista previa
            </button>
            <button
              onClick={() => setMode("paths")}
              className={`px-3 py-1.5 text-xs font-bold ${mode === "paths" ? "bg-white text-[#0C1330] shadow-sm" : "text-[#7A8194]"}`}
            >
              Trazados
            </button>
          </div>
        )}
      </div>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`paper-grid relative flex min-h-[300px] items-center justify-center overflow-hidden border border-dashed p-4 transition-colors sm:min-h-[430px] ${isDragging ? "border-[#1652F5] bg-[#eef3ff]" : "border-[#CBCAC0] bg-[#F4F3EE]"}`}
      >
        {processing ? (
          <div className="flex h-[260px] w-full max-w-[480px] sm:h-[380px] flex-col items-center justify-center gap-4 border border-[#DEDDD3] bg-white p-6 shadow-[0_15px_35px_rgba(12,19,48,.1)]">
            <div className="font-display text-3xl tabular-nums text-[#0C1330]">
              {progress}%
            </div>
            <div className="h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-[#E9E8DE]">
              <div
                className="h-full rounded-full bg-[#1652F5] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#7A8194]">
              {(currentStage && STAGE_LABELS[currentStage]) || "Procesando"}…
            </span>
            <button
              onClick={cancel}
              className="text-xs font-bold text-[#7A8194] underline decoration-dotted hover:text-[#0C1330]"
            >
              Cancelar
            </button>
          </div>
        ) : removingBg ? (
          <div className="flex h-[260px] w-full max-w-[480px] sm:h-[380px] flex-col items-center justify-center gap-4 border border-[#DEDDD3] bg-white p-6 shadow-[0_15px_35px_rgba(12,19,48,.1)]">
            <RefreshCw size={28} className="animate-spin text-[#1652F5]" />
            <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#7A8194]">
              Quitando fondo…
            </span>
          </div>
        ) : tool === "vectorize" && svg && displaySvg && file ? (
          <CompareSlider
            file={file}
            rightLabel="SVG (Vista previa)"
            rightBadge="Vector"
            checkerboard={mode !== "paths"}
          >
            <div
              className="h-full w-full p-6 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
              dangerouslySetInnerHTML={{ __html: displaySvg }}
            />
            {mode === "paths" && (
              <div className="pointer-events-none absolute inset-0 border-2 border-[#1652F5]/40" />
            )}
          </CompareSlider>
        ) : tool === "remove-bg" && removedBgUrl && file ? (
          <CompareSlider file={file} rightLabel="Sin fondo" rightBadge="PNG">
            <img
              src={removedBgUrl}
              alt="Imagen sin fondo"
              className="h-full w-full object-contain p-6"
            />
          </CompareSlider>
        ) : file && previewUrl ? (
          <div className="checkerboard relative flex h-[260px] w-full max-w-[480px] sm:h-[380px] items-center justify-center overflow-hidden border border-[#DEDDD3] shadow-[0_15px_35px_rgba(12,19,48,.1)]">
            <div className="font-technical absolute left-4 top-4 z-10 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330] shadow-sm">
              Vista previa
            </div>
            <img
              src={previewUrl}
              alt={file.name}
              className="h-full w-full object-contain p-6"
            />
          </div>
        ) : (
          <button
            onClick={choose}
            className="group flex flex-col items-center gap-3 text-center"
          >
            <ImagePlus
              size={40}
              className="text-[#9AA1B2] transition-transform group-hover:-translate-y-1"
            />
            <span className="font-display text-lg text-[#0C1330]">
              Suelta una imagen aquí
            </span>
            <span className="text-xs text-[#7A8194]">
              o haz clic para explorar · PNG, JPG, WEBP
            </span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFile}
          className="hidden"
        />
      </div>
      <div className="font-technical mt-3 flex flex-wrap items-center justify-between gap-2 border border-[#DEDDD3] bg-[#FBFBF7] px-3 py-2 text-[11px] text-[#7A8194]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#0C1330]">
            100% <ChevronDown size={12} />
          </span>
          <button
            onClick={() => setZoomTool("hand")}
            aria-label="Herramienta mano"
            aria-pressed={zoomTool === "hand"}
            className={`flex h-7 w-7 items-center justify-center border ${zoomTool === "hand" ? "border-[#0C1330] bg-[#0C1330] text-white" : "border-[#DEDDD3] bg-white text-[#0C1330] hover:border-[#0C1330]"}`}
          >
            <Hand size={14} />
          </button>
          <button
            onClick={() => setZoomTool("fit")}
            aria-label="Ajustar a pantalla"
            aria-pressed={zoomTool === "fit"}
            className={`flex h-7 w-7 items-center justify-center border ${zoomTool === "fit" ? "border-[#0C1330] bg-[#0C1330] text-white" : "border-[#DEDDD3] bg-white text-[#0C1330] hover:border-[#0C1330]"}`}
          >
            <Maximize size={14} />
          </button>
        </div>
        <RangeSlider
          min={0}
          max={100}
          value={zoom}
          onChange={setZoom}
          className="w-32"
        />
      </div>

      {tool === "vectorize" && (
        <div className="mt-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
            <Palette size={14} className="text-[#1652F5]" /> Colores detectados
          </div>
          {detectedColors.length === 0 ? (
            <p className="mt-2 text-[11px] text-[#9AA1B2]">
              Genera una preview para ver los colores del trazo.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {visibleSwatches.map(color => (
                    <span
                      key={color.id}
                      title={colorOverrides[color.id] ?? `#${color.hex}`}
                      className="h-6 w-6 shrink-0 rounded-full border border-[#DEDDD3]"
                      style={{
                        backgroundColor:
                          colorOverrides[color.id] ?? `#${color.hex}`,
                      }}
                    />
                  ))}
                  {remainingCount > 0 && (
                    <span className="flex h-6 shrink-0 items-center justify-center rounded-full border border-[#C8E93F] bg-[#F2F9DA] px-2 text-[10px] font-bold text-[#5F7A0C]">
                      +{remainingCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-[#7A8194]">
                  Cambia cualquier color conservando su sombreado. Cada
                  selector empieza en el color que ya tiene la imagen.
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {detectedColors.map(color => {
                  const current = colorOverrides[color.id] ?? `#${color.hex}`;
                  return (
                    <ColorInput
                      key={color.id}
                      value={current}
                      onChange={hex => setColorOverride(color.id, hex)}
                      label={current}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
