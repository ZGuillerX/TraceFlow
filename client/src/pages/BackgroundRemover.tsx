/* TraceFlow / Vector Atelier: eliminación de fondos con checkerboard, anotaciones antes/después y acción azul eléctrica. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Eraser,
  ImagePlus,
  Maximize2,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import QualitySelector from "@/components/workspace/settings/QualitySelector";
import TraceFlowShell from "@/components/layout/TraceFlowShell";
import ZoomLightbox from "@/components/layout/ZoomLightbox";
import { toast } from "sonner";
import sample from "@/assets/sample-transform.webp";
import { useDropzone } from "@/hooks/useDropzone";
import { removeBackgroundApi, type RemoveBgQuality } from "@/lib/api";
import { downloadUrl } from "@/lib/download";
import { commitFileLoad } from "@/lib/loadFile";

export default function BackgroundRemover() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState<RemoveBgQuality>("high");
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    if (!processing) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [processing]);
  const choose = () => input.current?.click();
  const loadFile = (f: File | undefined) =>
    commitFileLoad(
      f,
      setFile,
      loaded => {
        setOriginalUrl(URL.createObjectURL(loaded));
        setResultUrl(null);
        setShowOriginal(false);
      },
      "Imagen lista para quitar el fondo."
    );
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) =>
    loadFile(e.target.files?.[0]);
  const { isDragging, onDragOver, onDragLeave, onDrop } = useDropzone({
    onDrop: loadFile,
    disabled: processing,
  });
  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
  };
  const process = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    setProcessing(true);
    try {
      const blob = await removeBackgroundApi(file, quality);
      setResultUrl(URL.createObjectURL(blob));
      setShowOriginal(false);
      toast.success("Fondo eliminado. Descarga lista.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo quitar el fondo. Intenta de nuevo."
      );
    } finally {
      setProcessing(false);
    }
  };
  const download = () => {
    if (!resultUrl) return toast.info("Procesa una imagen para descargar.");
    downloadUrl(
      resultUrl,
      (file?.name.replace(/\.[^.]+$/, "") || "traceflow") + "-sin-fondo.png"
    );
    toast.success("PNG transparente descargado.");
  };
  const imgSrc = showOriginal ? originalUrl || sample : resultUrl || sample;
  const isDemo = showOriginal ? !originalUrl : !resultUrl;
  return (
    <TraceFlowShell workspace>
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow">02 / Quitar fondo</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              Quitar fondo
            </h1>
            <p className="mt-2 max-w-[560px] text-sm text-[#4B5266]">
              Limpia el fondo. Conserva lo importante. Exporta un recorte listo
              para usar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#7A8194]">
            <Sparkles size={14} className="text-[#1652F5]" /> Inteligencia de
            bordes
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="border border-[#DEDDD3] bg-white p-4 shadow-[0_18px_50px_rgba(16,26,70,.06)] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
                <Eraser size={15} className="text-[#1652F5]" /> Antes / después
              </div>
              <button
                onClick={() => setShowOriginal(v => !v)}
                className="border border-[#DEDDD3] px-3 py-2 text-xs font-bold text-[#0C1330] hover:border-[#1652F5]"
              >
                {showOriginal ? "Ver resultado" : "Ver original"}
              </button>
            </div>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative flex min-h-[490px] items-center justify-center overflow-hidden border p-5 transition-colors ${isDragging ? "border-[#1652F5] bg-[#eef3ff]" : "border-[#DEDDD3] bg-[#FAF9F5]"}`}
            >
              <div
                className={`relative h-[330px] w-full max-w-[560px] overflow-hidden border border-[#DEDDD3] ${showOriginal ? "bg-[#F4F3ED]" : "checkerboard"}`}
              >
                <img
                  src={imgSrc}
                  alt="Vista previa de la eliminación de fondo"
                  className={`h-full w-full object-contain ${isDemo ? "mix-blend-multiply opacity-90" : ""}`}
                />
                <div className="absolute left-4 top-4 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330] shadow-sm">
                  {showOriginal ? "Original" : "Resultado transparente"}
                </div>
                <button
                  onClick={() => setZoomed(true)}
                  className="absolute bottom-4 right-4 rounded-lg bg-white/90 p-2 text-[#0C1330] shadow-sm hover:bg-white"
                  aria-label="Ampliar preview"
                >
                  <Maximize2 size={15} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#7A8194]">
                {file ? (
                  <span className="font-semibold text-[#0C1330]">
                    {file.name}
                  </span>
                ) : (
                  "Carga una imagen para ver el resultado"
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="rounded-lg p-2 text-[#7A8194] hover:bg-[#F4F3ED]"
                  aria-label="Restablecer"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={choose}
                  className="flex items-center gap-2 border border-[#DEDDD3] px-3 py-2 text-xs font-bold text-[#0C1330] hover:border-[#1652F5]"
                >
                  <Upload size={14} /> {file ? "Reemplazar" : "Elegir archivo"}
                </button>
              </div>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFile}
              className="hidden"
            />
          </section>
          <aside className="border border-[#DEDDD3] bg-[#FAF9F5] p-5">
            <div className="mb-6">
              <div className="eyebrow">Refinar bordes</div>
              <h2 className="mt-1 font-display text-lg font-semibold">
                Ajustes de recorte
              </h2>
            </div>
            <div className="border border-[#DEDDD3] bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
                <ImagePlus size={15} className="text-[#1652F5]" /> Tipos de
                entrada
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#7A8194]">
                PNG, JPG o WEBP hasta 15 MB.
              </p>
            </div>
            <div className="mt-4">
              <label className="text-xs font-bold text-[#0C1330]">
                Calidad
              </label>
              <QualitySelector
                value={quality}
                onChange={setQuality}
                className="mt-2"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-[#7A8194]">
                {quality === "fast"
                  ? "Más rápida, puede fallar en detalles oscuros de alto contraste (ojos, sombras marcadas)."
                  : "Mejor resultado en detalles finos. Tarda algo más."}
              </p>
            </div>
            <button
              onClick={process}
              className="button-press mt-8 flex w-full items-center justify-center gap-2 bg-[#1652F5] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#0B3ECB]"
            >
              {processing ? (
                <RotateCcw size={16} className="animate-spin" />
              ) : (
                <Eraser size={16} />
              )}{" "}
              {processing
                ? `Quitando fondo… ${elapsed}s`
                : "Quitar fondo"}
            </button>
            {processing && elapsed >= 5 && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-[#7A8194]">
                La primera vez puede tardar hasta 90 segundos mientras se
                carga el modelo de IA. Las siguientes veces será mucho más
                rápido.
              </p>
            )}
            <button
              onClick={download}
              className="button-press mt-2 flex w-full items-center justify-center gap-2 border border-[#DEDDD3] bg-white px-4 py-3 text-sm font-bold text-[#0C1330] hover:border-[#1652F5]"
            >
              <ArrowDownToLine size={16} /> Descargar PNG
            </button>
          </aside>
        </div>
      </div>
      <ZoomLightbox
        src={imgSrc}
        alt="Vista previa ampliada"
        open={zoomed}
        onClose={() => setZoomed(false)}
        imgClassName={isDemo ? "mix-blend-multiply opacity-90" : ""}
      />
    </TraceFlowShell>
  );
}
