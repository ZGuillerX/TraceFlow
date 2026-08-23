/* TraceFlow / Vector Atelier: workspace de vectorización con superficies de precisión, grid y anotaciones de trazado. */
import { useMemo, useRef, useState } from "react";
import TraceFlowShell from "@/components/TraceFlowShell";
import PreviewCanvas from "@/components/workspace/PreviewCanvas";
import SettingsPanel from "@/components/workspace/SettingsPanel";
import { toast } from "sonner";
import { vectorizeImageStream } from "@/lib/api";
import { detectColors, recolorSvg } from "@/lib/recolor";

export default function Workspace() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [bgHex, setBgHex] = useState<string | null>(null);
  const [detail, setDetail] = useState(72);
  const [colors, setColors] = useState(8);
  const [autoColors, setAutoColors] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>(
    {}
  );
  const [mode, setMode] = useState<"preview" | "paths">("preview");
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const choose = () => input.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setSvg(null);
      toast.success("Imagen cargada. Ajusta los parámetros para continuar.");
    }
  };
  const detectedColors = useMemo(
    () => (svg ? detectColors(svg, bgHex) : []),
    [svg, bgHex]
  );
  const displaySvg = useMemo(
    () =>
      svg ? recolorSvg(svg, detectedColors, colorOverrides, bgHex) : svg,
    [svg, detectedColors, colorOverrides, bgHex]
  );
  const setColorOverride = (id: string, hex: string) =>
    setColorOverrides(prev => ({ ...prev, [id]: hex }));
  const process = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    const controller = new AbortController();
    abortController.current = controller;
    setProcessing(true);
    setCurrentStage(null);
    try {
      const { svg, bgHex } = await vectorizeImageStream(
        file,
        { detail, colors, autoColors, removeBg },
        stage => setCurrentStage(stage.stage),
        controller.signal
      );
      setSvg(svg);
      setBgHex(bgHex);
      setColorOverrides({});
      toast.success("Preview vectorial actualizada.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Vectorización cancelada.");
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo vectorizar la imagen. Intenta de nuevo."
        );
      }
    } finally {
      setProcessing(false);
      abortController.current = null;
    }
  };
  const cancel = () => abortController.current?.abort();
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
          <PreviewCanvas
            input={input}
            file={file}
            svg={svg}
            displaySvg={displaySvg}
            mode={mode}
            setMode={setMode}
            choose={choose}
            onFile={onFile}
            processing={processing}
            currentStage={currentStage}
            cancel={cancel}
          />
          <SettingsPanel
            detail={detail}
            setDetail={setDetail}
            autoColors={autoColors}
            setAutoColors={setAutoColors}
            colors={colors}
            setColors={setColors}
            removeBg={removeBg}
            setRemoveBg={setRemoveBg}
            detectedColors={detectedColors}
            colorOverrides={colorOverrides}
            setColorOverride={setColorOverride}
            processing={processing}
            process={process}
            download={download}
          />
        </div>
      </div>
    </TraceFlowShell>
  );
}
