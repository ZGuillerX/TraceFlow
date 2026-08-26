/* TraceFlow / Vector Atelier: Studio de vectorización con look de editor profesional. */
import { useMemo, useRef, useState } from "react";
import StudioTopBar from "@/components/studio/StudioTopBar";
import InspectorPanel from "@/components/studio/InspectorPanel";
import PreviewCanvas, {
  type StudioTool,
} from "@/components/workspace/PreviewCanvas";
import SettingsPanel from "@/components/workspace/SettingsPanel";
import { toast } from "sonner";
import {
  removeBackgroundApi,
  vectorizeImageStream,
  type RemoveBgQuality,
} from "@/lib/api";
import { detectColors, recolorSvg } from "@/lib/recolor";

export default function Workspace() {
  const input = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<StudioTool>("vectorize");
  const [file, setFile] = useState<File | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [bgHex, setBgHex] = useState<string | null>(null);
  const [detail, setDetail] = useState(72);
  const [colors, setColors] = useState(8);
  const [autoColors, setAutoColors] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgQuality, setBgQuality] = useState<RemoveBgQuality>("high");
  const [removingBg, setRemovingBg] = useState(false);
  const [removedBgUrl, setRemovedBgUrl] = useState<string | null>(null);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>(
    {}
  );
  const [mode, setMode] = useState<"preview" | "paths">("preview");
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const choose = () => input.current?.click();
  const clearRemovedBg = () => {
    if (removedBgUrl) URL.revokeObjectURL(removedBgUrl);
    setRemovedBgUrl(null);
  };
  const loadFile = (f: File | undefined) => {
    if (f) {
      setFile(f);
      setSvg(null);
      clearRemovedBg();
      toast.success("Imagen cargada. Ajusta los parámetros para continuar.");
    }
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) =>
    loadFile(e.target.files?.[0]);
  const removeFile = () => {
    setFile(null);
    setSvg(null);
    clearRemovedBg();
    setColorOverrides({});
  };
  const detectedColors = useMemo(
    () => (svg ? detectColors(svg, bgHex) : []),
    [svg, bgHex]
  );
  const displaySvg = useMemo(
    () => (svg ? recolorSvg(svg, detectedColors, colorOverrides, bgHex) : svg),
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
  const removeBackground = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    setRemovingBg(true);
    try {
      const blob = await removeBackgroundApi(file, bgQuality);
      clearRemovedBg();
      setRemovedBgUrl(URL.createObjectURL(blob));
      toast.success("Fondo eliminado.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo quitar el fondo. Intenta de nuevo."
      );
    } finally {
      setRemovingBg(false);
    }
  };
  const downloadRemovedBg = () => {
    if (!removedBgUrl) return toast.info("Quita el fondo primero.");
    const a = document.createElement("a");
    a.href = removedBgUrl;
    a.download =
      (file?.name.replace(/\.[^.]+$/, "") || "traceflow") + "-sin-fondo.png";
    a.click();
    toast.success("Exportación PNG lista.");
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
    <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#0C1330] lg:h-screen lg:overflow-hidden">
      <StudioTopBar />
      <div className="grid flex-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[300px_minmax(0,1fr)_280px] lg:overflow-hidden lg:p-6">
        <div className="flex flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          <SettingsPanel
            tool={tool}
            setTool={setTool}
            detail={detail}
            setDetail={setDetail}
            autoColors={autoColors}
            setAutoColors={setAutoColors}
            colors={colors}
            setColors={setColors}
            removeBg={removeBg}
            setRemoveBg={setRemoveBg}
            bgQuality={bgQuality}
            setBgQuality={setBgQuality}
          />
        </div>
        <div className="lg:overflow-y-auto">
          <PreviewCanvas
            input={input}
            tool={tool}
            file={file}
            svg={svg}
            displaySvg={displaySvg}
            mode={mode}
            setMode={setMode}
            choose={choose}
            onFile={onFile}
            onDropFile={loadFile}
            onRemove={removeFile}
            processing={processing}
            currentStage={currentStage}
            cancel={cancel}
            removingBg={removingBg}
            removedBgUrl={removedBgUrl}
            detectedColors={detectedColors}
            colorOverrides={colorOverrides}
            setColorOverride={setColorOverride}
          />
        </div>
        <InspectorPanel
          tool={tool}
          svg={svg}
          download={download}
          process={process}
          processing={processing}
          removedBgUrl={removedBgUrl}
          downloadRemovedBg={downloadRemovedBg}
          removeBackground={removeBackground}
          removingBg={removingBg}
        />
      </div>
    </div>
  );
}
