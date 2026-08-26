import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { ImagePlus, MousePointer2, RefreshCw, X } from "lucide-react";
import CompareSlider from "@/components/studio/CompareSlider";
import CanvasZoomBar, { type CanvasTool } from "./CanvasZoomBar";
import DetectedColorsPanel from "./DetectedColorsPanel";
import PathColorPopover from "./PathColorPopover";
import SourceChip from "./SourceChip";
import { useDropzone } from "@/hooks/useDropzone";
import { useImageDimensions } from "@/hooks/useImageDimensions";
import { tagPaths, type DetectedColor } from "@/lib/recolor";

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
  setPathOverride: (traceIndex: number, hex: string) => void;
}

interface SelectedPath {
  traceIndex: number;
  hex: string;
  x: number;
  y: number;
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
 * Original/SVG una vez listo, los colores detectados, y (en modo
 * "seleccionar") un clic directo sobre cualquier trazo del SVG para
 * recolorearlo sin afectar a otros trazos que compartan su color. */
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
  setPathOverride,
}: PreviewCanvasProps) {
  const progress = currentStage ? (STAGE_PROGRESS[currentStage] ?? 0) : 0;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const dims = useImageDimensions(previewUrl);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("hand");
  const [zoom, setZoom] = useState(100);
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  // cada <path> recibe un id por su orden de aparicion, para poder
  // identificar en el click exactamente cual se toco -- ver
  // lib/recolor.ts, tagPaths. No cambia nada visual (data-* no tiene
  // efecto de estilo), solo hace clickeable cada trazo por separado.
  const interactiveSvg = useMemo(
    () => (displaySvg ? tagPaths(displaySvg) : displaySvg),
    [displaySvg]
  );

  // ajustar a pantalla: vuelve a 100% y recentra el scroll -- con
  // object-contain el contenido ya encaja completo al 100%, asi que
  // "ajustar" equivale a deshacer cualquier zoom/pan manual.
  const fitToScreen = () => {
    setZoom(100);
    const el = canvasRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
        el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
      });
    }
  };

  // pan con arrastre: solo activo con la herramienta "mano" y zoom >
  // 100% (por debajo de eso el contenido no se desborda, no hay nada
  // que desplazar). Mueve el scroll del contenedor directamente en vez
  // de un transform propio, para heredar gratis los limites naturales
  // del scroll (no se puede arrastrar mas alla del contenido).
  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (canvasTool !== "hand" || zoom <= 100 || !canvasRef.current) return;
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop,
    };
    canvasRef.current.setPointerCapture(e.pointerId);
  };
  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panState.current || !canvasRef.current) return;
    canvasRef.current.scrollLeft =
      panState.current.scrollLeft - (e.clientX - panState.current.startX);
    canvasRef.current.scrollTop =
      panState.current.scrollTop - (e.clientY - panState.current.startY);
  };
  const onCanvasPointerUp = () => {
    panState.current = null;
  };

  // herramienta "seleccionar": clic directo sobre un trazo del SVG
  // para recolorearlo puntualmente, sin depender de que
  // detectColors lo haya separado como familia propia (util cuando
  // dos partes distintas, p. ej. un ojo y una oreja, comparten el
  // mismo color y quedarian fusionadas en un solo grupo).
  const onSvgAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canvasTool !== "select" || !canvasRef.current) return;
    const target = e.target as SVGElement;
    const traceIdAttr = target.getAttribute?.("data-trace-id");
    if (traceIdAttr === null || traceIdAttr === undefined) return;
    const fill = target.getAttribute("fill");
    if (!fill) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setSelectedPath({
      traceIndex: Number(traceIdAttr),
      hex: fill.toUpperCase(),
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top,
    });
  };

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // un svg nuevo (o ninguno) invalida cualquier trazo seleccionado del
  // resultado anterior -- evita un popover apuntando a un indice que
  // ya no corresponde a nada.
  useEffect(() => {
    setSelectedPath(null);
  }, [svg]);

  // processing bloquea el drop: soltar una imagen nueva a medio
  // trazado interrumpiria el proceso en curso de forma confusa (para
  // reemplazar hay que cancelar primero).
  const dropzone = useDropzone({ onDrop: onDropFile, disabled: processing });

  return (
    <section className="border border-[#DEDDD3] bg-white p-4 shadow-[0_18px_50px_rgba(12,19,48,.06)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
            <MousePointer2 size={15} className="text-[#1652F5]" /> Lienzo de
            preview
          </div>
          {file && (
            <SourceChip
              file={file}
              previewUrl={previewUrl}
              dims={dims}
              processing={processing}
              onRemove={onRemove}
            />
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
        ref={canvasRef}
        onDragOver={dropzone.onDragOver}
        onDragLeave={dropzone.onDragLeave}
        onDrop={dropzone.onDrop}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerLeave={onCanvasPointerUp}
        className={`paper-grid relative flex min-h-[300px] items-center justify-center overflow-auto border border-dashed p-4 transition-colors sm:min-h-[430px] ${dropzone.isDragging ? "border-[#1652F5] bg-[#eef3ff]" : "border-[#CBCAC0] bg-[#F4F3EE]"} ${canvasTool === "hand" && zoom > 100 ? "cursor-grab active:cursor-grabbing" : ""} ${canvasTool === "select" ? "cursor-pointer" : ""}`}
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
        ) : (tool === "vectorize" && svg && displaySvg && file) ||
          (tool === "remove-bg" && removedBgUrl && file) ||
          (file && previewUrl) ? (
          <div
            style={{ transform: `scale(${zoom / 100})` }}
            // w-full max-w-[480px] igual que sus 3 posibles contenidos
            // (CompareSlider o el preview simple) -- sin esto, este div
            // no tiene ancho propio (shrink-to-fit) y su contenido es
            // enteramente position:absolute (sin nada en flujo normal
            // que le de una referencia de ancho), asi que colapsa a
            // practicamente 0px en vez de mostrar el resultado.
            className="w-full max-w-[480px] shrink-0 transition-transform"
          >
            {tool === "vectorize" && svg && displaySvg && file ? (
              <CompareSlider
                file={file}
                rightLabel="SVG (Vista previa)"
                rightBadge="Vector"
                checkerboard={mode !== "paths"}
                onClose={onRemove}
              >
                <div
                  onClick={onSvgAreaClick}
                  className="h-full w-full p-6 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
                  dangerouslySetInnerHTML={{ __html: interactiveSvg ?? "" }}
                />
                {mode === "paths" && (
                  <div className="pointer-events-none absolute inset-0 border-2 border-[#1652F5]/40" />
                )}
              </CompareSlider>
            ) : tool === "remove-bg" && removedBgUrl && file ? (
              <CompareSlider
                file={file}
                rightLabel="Sin fondo"
                rightBadge="PNG"
                onClose={onRemove}
              >
                <img
                  src={removedBgUrl}
                  alt="Imagen sin fondo"
                  draggable={false}
                  className="h-full w-full object-contain p-6"
                />
              </CompareSlider>
            ) : (
              file &&
              previewUrl && (
                <div className="checkerboard relative flex h-[260px] w-full max-w-[480px] items-center justify-center overflow-hidden border border-[#DEDDD3] shadow-[0_15px_35px_rgba(12,19,48,.1)] sm:h-[380px]">
                  <div className="font-technical absolute left-4 top-4 z-10 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330] shadow-sm">
                    Vista previa
                  </div>
                  <button
                    onClick={onRemove}
                    disabled={processing}
                    aria-label="Quitar imagen"
                    className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center bg-white/90 text-[#0C1330] shadow-sm hover:bg-[#0C1330] hover:text-white disabled:opacity-40"
                  >
                    <X size={13} />
                  </button>
                  <img
                    src={previewUrl}
                    alt={file.name}
                    draggable={false}
                    className="h-full w-full object-contain p-6"
                  />
                </div>
              )
            )}
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
        {selectedPath && (
          <PathColorPopover
            x={selectedPath.x}
            y={selectedPath.y}
            hex={selectedPath.hex}
            onChange={hex => {
              setPathOverride(selectedPath.traceIndex, hex);
              setSelectedPath(prev => (prev ? { ...prev, hex: hex.toUpperCase() } : prev));
            }}
            onClose={() => setSelectedPath(null)}
          />
        )}
      </div>
      <CanvasZoomBar
        zoom={zoom}
        setZoom={setZoom}
        canvasTool={canvasTool}
        setCanvasTool={setCanvasTool}
        onFitToScreen={fitToScreen}
      />

      {tool === "vectorize" && (
        <DetectedColorsPanel
          detectedColors={detectedColors}
          colorOverrides={colorOverrides}
          setColorOverride={setColorOverride}
        />
      )}
    </section>
  );
}
