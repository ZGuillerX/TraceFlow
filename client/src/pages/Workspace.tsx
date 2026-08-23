/* TraceFlow / Vector Atelier: workspace de vectorización con superficies de precisión, grid y anotaciones de trazado. */
import { useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ChevronDown,
  Eraser,
  FileImage,
  Info,
  MousePointer2,
  Palette,
  RefreshCw,
  Upload,
  WandSparkles,
  Wand2,
  Zap,
} from "lucide-react";
import TraceFlowShell from "@/components/TraceFlowShell";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import empty from "@/assets/empty-state.svg";
import { extractErrorMessage } from "@/lib/errors";
import { recolorSvg } from "@/lib/recolor";

export default function Workspace() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [bgHex, setBgHex] = useState<string | null>(null);
  const [detail, setDetail] = useState(72);
  const [colors, setColors] = useState(8);
  const [autoColors, setAutoColors] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);
  const [customColorOn, setCustomColorOn] = useState(false);
  const [customColor, setCustomColor] = useState("#1687F8");
  const [mode, setMode] = useState<"preview" | "paths">("preview");
  const [processing, setProcessing] = useState(false);
  const choose = () => input.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setSvg(null);
      toast.success("Imagen cargada. Ajusta los parámetros para continuar.");
    }
  };
  const displaySvg = useMemo(
    () => (svg && customColorOn ? recolorSvg(svg, customColor, bgHex) : svg),
    [svg, customColorOn, customColor, bgHex]
  );
  const process = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    setProcessing(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("detail", String(detail));
      body.append("colors", String(colors));
      body.append("auto_colors", String(autoColors));
      body.append("remove_bg", String(removeBg));
      const res = await fetch("/api/vectorize", { method: "POST", body });
      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(
            res,
            "No se pudo vectorizar la imagen. Intenta de nuevo."
          )
        );
      }
      setSvg(await res.text());
      setBgHex(res.headers.get("X-Bg-Color"));
      toast.success("Preview vectorial actualizada.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo vectorizar la imagen. Intenta de nuevo."
      );
    } finally {
      setProcessing(false);
    }
  };
  const download = () => {
    if (!displaySvg) return toast.info("Genera una preview para exportar.");
    const url = URL.createObjectURL(
      new Blob([displaySvg], { type: "image/svg+xml" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (file?.name.replace(/\.[^.]+$/, "") || "traceflow") +
      (removeBg ? "-sin-fondo" : "") +
      ".svg";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportación SVG lista.");
  };
  return (
    <TraceFlowShell workspace>
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow">01 / Motor vectorial</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              Vectorizar raster
            </h1>
            <p className="mt-2 max-w-[560px] text-sm text-[#69728a]">
              Convierte una imagen en curvas limpias, editables y listas para
              producción.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#7a8299]">
            <span className="h-2 w-2 rounded-full bg-[#22C7E8]" /> Guardado
            local activo
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
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
              {svg ? (
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
                      <span
                        key={i}
                        className="h-3 w-3 rounded-[2px] bg-[#1687F8]"
                      />
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
                <Upload size={14} />{" "}
                {file ? "Reemplazar imagen" : "Elegir archivo"}
              </button>
            </div>
          </section>
          <aside className="border border-[#cfd5e1] bg-[#f6f6f2] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="eyebrow">Ajustes</div>
                <h2 className="mt-1 font-display text-lg font-semibold">
                  Controles de trazado
                </h2>
              </div>
              <Zap size={18} className="text-[#1687F8]" />
            </div>
            <label className="text-xs font-bold text-[#101A46]">
              Nivel de detalle{" "}
              <span className="float-right text-[#1687F8]">{detail}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={detail}
              onChange={e => setDetail(Number(e.target.value))}
              className="mt-3 w-full accent-[#1687F8]"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">
              Más detalle conserva bordes pequeños y textura.
            </p>
            <div className="my-6 hairline" />
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="auto-colors"
                className="flex items-center gap-2 text-xs font-bold text-[#101A46]"
              >
                <Wand2 size={15} className="text-[#1687F8]" /> Detectar colores
                automáticamente
              </label>
              <Switch
                id="auto-colors"
                checked={autoColors}
                onCheckedChange={setAutoColors}
                className="data-[state=checked]:bg-[#1687F8]"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">
              Analiza la imagen y elige cuántos colores usar. Apágalo para
              controlarlo tú mismo.
            </p>
            <label
              className={`mt-4 block text-xs font-bold ${autoColors ? "text-[#b3b8c4]" : "text-[#101A46]"}`}
            >
              Grupos de color{" "}
              <span
                className={`float-right ${autoColors ? "text-[#b3b8c4]" : "text-[#1687F8]"}`}
              >
                {colors}
              </span>
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={colors}
              disabled={autoColors}
              onChange={e => setColors(Number(e.target.value))}
              className="mt-3 w-full accent-[#1687F8] disabled:opacity-40"
            />
            <div className="my-6 hairline" />
            <label className="text-xs font-bold text-[#101A46]">
              Formato de salida
            </label>
            <button
              onClick={() =>
                toast.info("SVG es el formato recomendado para este flujo.")
              }
              className="mt-3 flex w-full items-center justify-between border border-[#cbd3df] bg-white px-3 py-3 text-sm font-bold text-[#101A46]"
            >
              <span className="flex items-center gap-2">
                <FileImage size={16} className="text-[#1687F8]" /> SVG
              </span>
              <ChevronDown size={15} className="text-[#7a8299]" />
            </button>
            <div className="my-6 hairline" />
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="remove-bg"
                className="flex items-center gap-2 text-xs font-bold text-[#101A46]"
              >
                <Eraser size={15} className="text-[#1687F8]" /> Quitar fondo
                antes de vectorizar
              </label>
              <Switch
                id="remove-bg"
                checked={removeBg}
                onCheckedChange={setRemoveBg}
                className="data-[state=checked]:bg-[#1687F8]"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">
              El SVG sale con fondo transparente en vez de un color solido de
              fondo. Tarda unos segundos mas.
            </p>
            <div className="my-6 hairline" />
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="custom-color"
                className="flex items-center gap-2 text-xs font-bold text-[#101A46]"
              >
                <Palette size={15} className="text-[#1687F8]" /> Color
                personalizado
              </label>
              <Switch
                id="custom-color"
                checked={customColorOn}
                onCheckedChange={setCustomColorOn}
                className="data-[state=checked]:bg-[#1687F8]"
              />
            </div>
            {customColorOn && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer border border-[#cbd3df] bg-white p-1"
                  aria-label="Elegir color"
                />
                <span className="text-xs font-bold uppercase text-[#101A46]">
                  {customColor}
                </span>
              </div>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">
              Repinta el trazo a este color conservando el sombreado original.
            </p>
            <button
              onClick={process}
              className="button-press mt-8 flex w-full items-center justify-center gap-2 bg-[#1687F8] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#0e74dd]"
            >
              {processing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <WandSparkles size={16} />
              )}{" "}
              {processing ? "Trazando…" : "Generar preview"}
            </button>
            <button
              onClick={download}
              className="button-press mt-2 flex w-full items-center justify-center gap-2 border border-[#cbd3df] bg-white px-4 py-3 text-sm font-bold text-[#101A46] hover:border-[#1687F8]"
            >
              <ArrowDownToLine size={16} /> Exportar SVG
            </button>
          </aside>
        </div>
      </div>
    </TraceFlowShell>
  );
}
