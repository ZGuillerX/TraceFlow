/* TraceFlow / Vector Atelier: Studio de vectorización con look de editor profesional. */
import { useRef, useState } from "react";
import StudioTopBar from "@/components/studio/StudioTopBar";
import InspectorPanel from "@/components/studio/InspectorPanel";
import PreviewCanvas, {
  type StudioTool,
} from "@/components/workspace/PreviewCanvas";
import SettingsPanel from "@/components/workspace/SettingsPanel";
import { toast } from "sonner";
import { useBackgroundRemovalTool } from "@/hooks/useBackgroundRemovalTool";
import { useVectorizeFlow } from "@/hooks/useVectorizeFlow";
import { useVectorizeParams } from "@/hooks/useVectorizeParams";
import { downloadBlob, downloadUrl } from "@/lib/download";
import { commitFileLoad } from "@/lib/loadFile";

export default function Workspace() {
  const input = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<StudioTool>("vectorize");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"preview" | "paths">("preview");

  const params = useVectorizeParams();
  const flow = useVectorizeFlow(file, params);
  const bgTool = useBackgroundRemovalTool(file);

  const choose = () => input.current?.click();
  const loadFile = (f: File | undefined) =>
    commitFileLoad(
      f,
      setFile,
      () => {
        flow.reset();
        bgTool.clearRemovedBg();
      },
      "Imagen cargada. Ajusta los parámetros para continuar."
    );
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) =>
    loadFile(e.target.files?.[0]);
  const removeFile = () => {
    setFile(null);
    flow.reset();
    bgTool.clearRemovedBg();
  };

  const downloadRemovedBg = () => {
    if (!bgTool.removedBgUrl) return toast.info("Quita el fondo primero.");
    downloadUrl(
      bgTool.removedBgUrl,
      (file?.name.replace(/\.[^.]+$/, "") || "traceflow") + "-sin-fondo.png"
    );
    toast.success("Exportación PNG lista.");
  };
  const download = () => {
    if (!flow.displaySvg)
      return toast.info("Genera una preview para exportar.");
    downloadBlob(
      new Blob([flow.displaySvg], { type: "image/svg+xml" }),
      (file?.name.replace(/\.[^.]+$/, "") || "traceflow") +
        (params.removeBg ? "-sin-fondo" : "") +
        ".svg"
    );
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
            detail={params.detail}
            setDetail={params.setDetail}
            autoColors={params.autoColors}
            setAutoColors={params.setAutoColors}
            colors={params.colors}
            setColors={params.setColors}
            curveSmoothing={params.curveSmoothing}
            setCurveSmoothing={params.setCurveSmoothing}
            autoSmoothing={params.autoSmoothing}
            setAutoSmoothing={params.setAutoSmoothing}
            colorThreshold={params.colorThreshold}
            setColorThreshold={params.setColorThreshold}
            autoThreshold={params.autoThreshold}
            setAutoThreshold={params.setAutoThreshold}
            removeBg={params.removeBg}
            setRemoveBg={params.setRemoveBg}
            bgQuality={bgTool.bgQuality}
            setBgQuality={bgTool.setBgQuality}
          />
        </div>
        <div className="lg:overflow-y-auto">
          <PreviewCanvas
            input={input}
            tool={tool}
            file={file}
            svg={flow.svg}
            displaySvg={flow.displaySvg}
            mode={mode}
            setMode={setMode}
            choose={choose}
            onFile={onFile}
            onDropFile={loadFile}
            onRemove={removeFile}
            processing={flow.processing}
            currentStage={flow.currentStage}
            cancel={flow.cancel}
            removingBg={bgTool.removingBg}
            removedBgUrl={bgTool.removedBgUrl}
            detectedColors={flow.detectedColors}
            colorOverrides={flow.colorOverrides}
            setColorOverride={flow.setColorOverride}
          />
        </div>
        <InspectorPanel
          tool={tool}
          svg={flow.svg}
          download={download}
          process={flow.process}
          processing={flow.processing}
          removedBgUrl={bgTool.removedBgUrl}
          downloadRemovedBg={downloadRemovedBg}
          removeBackground={bgTool.removeBackground}
          removingBg={bgTool.removingBg}
        />
      </div>
    </div>
  );
}
