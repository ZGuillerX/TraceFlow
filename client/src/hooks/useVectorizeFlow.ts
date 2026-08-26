import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { vectorizeImageStream } from "@/lib/api";
import { applyPathOverrides, detectColors, recolorSvg } from "@/lib/recolor";
import type { VectorizeParams } from "./useVectorizeParams";

/** Encapsula el flujo completo de vectorizado: la petición SSE con
 * cancelación, el resultado (svg/bgHex), el recoloreado derivado
 * (detectedColors/displaySvg) y el estado de progreso -- todo lo que
 * PreviewCanvas/InspectorPanel necesitan del lado "vectorizar" del
 * Studio. */
export function useVectorizeFlow(file: File | null, params: VectorizeParams) {
  const [svg, setSvg] = useState<string | null>(null);
  const [bgHex, setBgHex] = useState<string | null>(null);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});
  const [pathOverrides, setPathOverrides] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const detectedColors = useMemo(() => (svg ? detectColors(svg, bgHex) : []), [svg, bgHex]);
  const displaySvg = useMemo(() => {
    if (!svg) return svg;
    const byGroup = recolorSvg(svg, detectedColors, colorOverrides, bgHex);
    return applyPathOverrides(byGroup, pathOverrides);
  }, [svg, detectedColors, colorOverrides, bgHex, pathOverrides]);

  const setColorOverride = (id: string, hex: string) =>
    setColorOverrides(prev => ({ ...prev, [id]: hex }));

  // ver PreviewCanvas: el trazo se identifica por su indice de
  // aparicion en displaySvg, no en el svg original -- ambos coinciden
  // en cantidad/orden porque recolorSvg solo cambia fills, nunca
  // agrega ni quita paths.
  const setPathOverride = (traceIndex: number, hex: string) =>
    setPathOverrides(prev => ({ ...prev, [traceIndex]: hex }));

  // se llama al cargar un archivo nuevo o al quitar el actual -- el
  // resultado vectorizado y los overrides de color pertenecen a la
  // imagen anterior, no tiene sentido conservarlos.
  const reset = () => {
    setSvg(null);
    setColorOverrides({});
    setPathOverrides({});
  };

  const process = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    const controller = new AbortController();
    abortController.current = controller;
    setProcessing(true);
    setCurrentStage(null);
    try {
      const { svg: resultSvg, bgHex: resultBgHex } = await vectorizeImageStream(
        file,
        {
          detail: params.detail,
          colors: params.colors,
          autoColors: params.autoColors,
          removeBg: params.removeBg,
          curveSmoothing: params.curveSmoothing,
          autoSmoothing: params.autoSmoothing,
          colorThreshold: params.colorThreshold,
          autoThreshold: params.autoThreshold,
        },
        stage => setCurrentStage(stage.stage),
        controller.signal
      );
      setSvg(resultSvg);
      setBgHex(resultBgHex);
      setColorOverrides({});
      setPathOverrides({});
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

  return {
    svg,
    displaySvg,
    processing,
    currentStage,
    detectedColors,
    colorOverrides,
    setColorOverride,
    pathOverrides,
    setPathOverride,
    process,
    cancel,
    reset,
  };
}
