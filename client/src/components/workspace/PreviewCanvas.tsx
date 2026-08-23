import type { RefObject } from "react";
import { Info, MousePointer2, Upload } from "lucide-react";
import empty from "@/assets/empty-state.svg";

interface PreviewCanvasProps {
  input: RefObject<HTMLInputElement | null>;
  file: File | null;
  svg: string | null;
  displaySvg: string | null;
  mode: "preview" | "paths";
  setMode: (mode: "preview" | "paths") => void;
  choose: () => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processing: boolean;
  currentStage: string | null;
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

/** Lienzo de preview del workspace de vectorización: dropzone antes de
 * cargar una imagen, silueta de "lista para vectorizar" con el archivo
 * cargado, una barra de progreso en vivo mientras vectoriza (una etapa
 * del pipeline por evento SSE), y el SVG resultante (con toggle vista
 * previa/trazados). */
export default function PreviewCanvas({
  input,
  file,
  svg,
  displaySvg,
  mode,
  setMode,
  choose,
  onFile,
  processing,
  currentStage,
}: PreviewCanvasProps) {
  const progress = currentStage ? (STAGE_PROGRESS[currentStage] ?? 0) : 0;
  return (
    <section className="min-h-[560px] border border-[#cfd5e1] bg-white p-4 shadow-[0_18px_50px_rgba(16,26,70,.06)] sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-[#101A46]">
          <MousePointer2 size={15} className="text-[#1687F8]" /> Lienzo de
          preview
        </div>
        <div className="flex border border-[#dfe2ea] bg-[#f2f3f5] p-1">
          <button
            onClick={() => setMode("preview")}
            className={`px-3 py-1.5 text-xs font-bold ${mode === "preview" ? "bg-white text-[#101A46] shadow-sm" : "text-[#7a8299]"}`}
          >
            Vista previa
          </button>
          <button
            onClick={() => setMode("paths")}
            className={`px-3 py-1.5 text-xs font-bold ${mode === "paths" ? "bg-white text-[#101A46] shadow-sm" : "text-[#7a8299]"}`}
          >
            Trazados
          </button>
        </div>
      </div>
      <div
        className={`paper-grid relative flex min-h-[430px] items-center justify-center overflow-hidden border border-dashed border-[#cbd3df] ${file ? "bg-[#f8fbff]" : "bg-[#fafaf7]"}`}
      >
        {processing ? (
          <div className="flex h-[380px] w-full max-w-[480px] flex-col items-center justify-center gap-4 border border-[#cfd8e6] bg-white p-6 shadow-[0_15px_35px_rgba(16,26,70,.1)]">
            <div className="font-display text-3xl font-semibold tabular-nums text-[#101A46]">
              {progress}%
            </div>
            <div className="h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-[#eef0f4]">
              <div
                className="h-full rounded-full bg-[#1687F8] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#7a8299]">
              {(currentStage && STAGE_LABELS[currentStage]) || "Procesando"}…
            </span>
          </div>
        ) : svg ? (
          <div
            className={`relative flex h-[380px] w-full max-w-[480px] items-center justify-center overflow-hidden border border-[#cfd8e6] p-6 shadow-[0_15px_35px_rgba(16,26,70,.1)] ${mode === "paths" ? "bg-white" : "checkerboard"}`}
          >
            <div
              className="h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
              dangerouslySetInnerHTML={{ __html: displaySvg! }}
            />
            {mode === "paths" && (
              <div className="absolute inset-0 border-2 border-[#7C3AED]/40" />
            )}
          </div>
        ) : file ? (
          <div className="relative flex h-[270px] w-[340px] items-center justify-center border border-[#cfd8e6] bg-white shadow-[0_15px_35px_rgba(16,26,70,.1)]">
            <div className="absolute left-8 top-10 grid grid-cols-4 gap-2 opacity-60">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="h-3 w-3 rounded-[2px] bg-[#1687F8]" />
              ))}
            </div>
            <svg viewBox="0 0 220 160" className="h-44 w-56">
              <path
                d="M20 88 C52 40, 76 30, 108 50 C140 70, 160 60, 196 24"
                fill="none"
                stroke="#1687F8"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M35 118 C88 118, 92 76, 132 76 C162 76, 170 105, 195 105"
                fill="none"
                stroke="#22C7E8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle
                cx="20"
                cy="88"
                r="7"
                fill="white"
                stroke="#101A46"
                strokeWidth="4"
              />
              <circle
                cx="196"
                cy="24"
                r="7"
                fill="white"
                stroke="#1687F8"
                strokeWidth="4"
              />
              <circle
                cx="35"
                cy="118"
                r="7"
                fill="white"
                stroke="#101A46"
                strokeWidth="4"
              />
            </svg>
            <span className="absolute bottom-4 left-4 right-4 truncate text-center text-[11px] font-bold text-[#101A46]">
              {file.name}
            </span>
          </div>
        ) : (
          <button
            onClick={choose}
            className="group flex flex-col items-center text-center"
          >
            <img
              src={empty}
              alt=""
              className="mb-5 h-32 w-40 object-contain opacity-80 transition-transform group-hover:-translate-y-1"
            />
            <span className="font-display text-lg font-semibold text-[#101A46]">
              Suelta una imagen aquí
            </span>
            <span className="mt-2 text-xs text-[#7a8299]">
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#7a8299]">
          <Info size={14} />{" "}
          {svg
            ? "SVG generado con vtracer"
            : file
              ? "Lista para vectorizar"
              : "Tu imagen permanece en este espacio"}
        </div>
        <button
          onClick={choose}
          className="flex items-center gap-2 border border-[#dfe2ea] px-3 py-2 text-xs font-bold text-[#101A46] hover:border-[#1687F8]"
        >
          <Upload size={14} /> {file ? "Reemplazar imagen" : "Elegir archivo"}
        </button>
      </div>
    </section>
  );
}
