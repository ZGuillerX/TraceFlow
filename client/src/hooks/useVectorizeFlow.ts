import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { vectorizeImageStream } from "@/lib/api";
import { applyPathOverrides, detectColors, recolorSvg } from "@/lib/recolor";
import type { VectorizeParams } from "./useVectorizeParams";

// por encima de esto el archivo original ya es pesado: repintar el
// SVG entero (recolorSvg + applyPathOverrides corren sobre el string
// completo en cada cambio) en cada tick del picker se siente
// trabado, asi que se vuelve a debounce.
const HEAVY_FILE_BYTES = 4 * 1024 * 1024;

// por encima de esta cantidad de trazos, aunque el archivo sea
// liviano, ese grupo puntual ya es costoso de repintar en vivo
// (recolorSvg toca cada fill que matchee, sin importar el tamano del
// archivo original).
const LARGE_GROUP_TRACE_COUNT = 60;

/** Encapsula el flujo completo de vectorizado: la petición SSE con
 * cancelación, el resultado (svg/bgHex), el recoloreado derivado
 * (detectedColors/displaySvg) y el estado de progreso -- todo lo que
 * PreviewCanvas/InspectorPanel necesitan del lado "vectorizar" del
 * Studio. */
export function useVectorizeFlow(file: File | null, params: VectorizeParams) {
  const [svg, setSvg] = useState<string | null>(null);
  const [bgHex, setBgHex] = useState<string | null>(null);
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>(
    {}
  );
  const [pathOverrides, setPathOverrides] = useState<Record<number, string>>(
    {}
  );
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const pendingColorOverrides = useRef<Record<string, string>>({});
  const colorOverrideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPathOverrides = useRef<Record<number, string>>({});
  const pathOverrideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectedColors = useMemo(
    () => (svg ? detectColors(svg, bgHex) : []),
    [svg, bgHex]
  );
  const displaySvg = useMemo(() => {
    if (!svg) return svg;
    const byGroup = recolorSvg(svg, detectedColors, colorOverrides, bgHex);
    return applyPathOverrides(byGroup, pathOverrides);
  }, [svg, detectedColors, colorOverrides, bgHex, pathOverrides]);

  // archivo pesado -> todo pasa por debounce, sin excepciones. Con
  // archivo liviano, cada override individual todavia puede caer en
  // debounce si el grupo puntual es muy grande (ver setColorOverride).
  const isHeavyFile = !!file && file.size > HEAVY_FILE_BYTES;

  const setColorOverride = (id: string, hex: string) => {
    const group = detectedColors.find(c => c.id === id);
    const isLargeGroup = (group?.count ?? 0) > LARGE_GROUP_TRACE_COUNT;

    if (!isHeavyFile && !isLargeGroup) {
      // liviano y grupo chico: se aplica en el acto, sin pasar por el
      // timer, para que el picker se sienta en tiempo real.
      if (colorOverrideTimer.current !== null) {
        clearTimeout(colorOverrideTimer.current);
        colorOverrideTimer.current = null;
      }
      delete pendingColorOverrides.current[id];
      setColorOverrides(prev => ({ ...prev, [id]: hex }));
      return;
    }

    pendingColorOverrides.current[id] = hex;
    if (colorOverrideTimer.current !== null) {
      clearTimeout(colorOverrideTimer.current);
    }

    colorOverrideTimer.current = setTimeout(() => {
      colorOverrideTimer.current = null;
      const nextOverrides = pendingColorOverrides.current;
      pendingColorOverrides.current = {};
      setColorOverrides(prev => ({ ...prev, ...nextOverrides }));
    }, 100);
  };

  // ver PreviewCanvas: el trazo se identifica por su indice de
  // aparicion en displaySvg, no en el svg original -- ambos coinciden
  // en cantidad/orden porque recolorSvg solo cambia fills, nunca
  // agrega ni quita paths.
  const setPathOverride = (
    traceIndex: number,
    hex: string,
    originalHex: string
  ) => {
    const normalizedOriginal = originalHex.replace("#", "").toUpperCase();
    const group = detectedColors.find(c =>
      c.members.includes(normalizedOriginal)
    );
    const isLargeGroup = (group?.count ?? 0) > LARGE_GROUP_TRACE_COUNT;

    if (!isHeavyFile && !isLargeGroup) {
      // liviano y el trazo pertenece a un grupo chico: en vivo, igual
      // que setColorOverride.
      if (pathOverrideTimer.current !== null) {
        clearTimeout(pathOverrideTimer.current);
        pathOverrideTimer.current = null;
      }
      delete pendingPathOverrides.current[traceIndex];
      setPathOverrides(prev => ({ ...prev, [traceIndex]: hex }));
      return;
    }

    pendingPathOverrides.current[traceIndex] = hex;
    if (pathOverrideTimer.current !== null) {
      clearTimeout(pathOverrideTimer.current);
    }

    pathOverrideTimer.current = setTimeout(() => {
      pathOverrideTimer.current = null;
      const nextOverrides = pendingPathOverrides.current;
      pendingPathOverrides.current = {};
      setPathOverrides(prev => ({ ...prev, ...nextOverrides }));
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (colorOverrideTimer.current !== null) {
        clearTimeout(colorOverrideTimer.current);
      }
      if (pathOverrideTimer.current !== null) {
        clearTimeout(pathOverrideTimer.current);
      }
    };
  }, []);

  // se llama al cargar un archivo nuevo o al quitar el actual -- el
  // resultado vectorizado y los overrides de color pertenecen a la
  // imagen anterior, no tiene sentido conservarlos.
  const reset = () => {
    if (colorOverrideTimer.current !== null) {
      clearTimeout(colorOverrideTimer.current);
      colorOverrideTimer.current = null;
    }
    if (pathOverrideTimer.current !== null) {
      clearTimeout(pathOverrideTimer.current);
      pathOverrideTimer.current = null;
    }
    pendingColorOverrides.current = {};
    pendingPathOverrides.current = {};
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
