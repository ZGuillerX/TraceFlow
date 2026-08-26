import { useState } from "react";

export interface VectorizeParams {
  detail: number;
  setDetail: (v: number) => void;
  colors: number;
  setColors: (v: number) => void;
  autoColors: boolean;
  setAutoColors: (v: boolean) => void;
  curveSmoothing: number;
  setCurveSmoothing: (v: number) => void;
  autoSmoothing: boolean;
  setAutoSmoothing: (v: boolean) => void;
  colorThreshold: number;
  setColorThreshold: (v: number) => void;
  autoThreshold: boolean;
  setAutoThreshold: (v: boolean) => void;
  removeBg: boolean;
  setRemoveBg: (v: boolean) => void;
}

/** Agrupa los ajustes de trazado del Studio (nivel de detalle, grupos
 * de color, suavizado de curvas, umbral de color, y si se quita el
 * fondo antes de vectorizar) en un solo objeto -- listo para pasar a
 * SettingsPanel sin acarrear 16 props sueltas en Workspace.tsx. */
export function useVectorizeParams(): VectorizeParams {
  const [detail, setDetail] = useState(72);
  const [colors, setColors] = useState(8);
  const [autoColors, setAutoColors] = useState(true);
  const [curveSmoothing, setCurveSmoothing] = useState(75);
  const [autoSmoothing, setAutoSmoothing] = useState(true);
  const [colorThreshold, setColorThreshold] = useState(60);
  const [autoThreshold, setAutoThreshold] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);

  return {
    detail,
    setDetail,
    colors,
    setColors,
    autoColors,
    setAutoColors,
    curveSmoothing,
    setCurveSmoothing,
    autoSmoothing,
    setAutoSmoothing,
    colorThreshold,
    setColorThreshold,
    autoThreshold,
    setAutoThreshold,
    removeBg,
    setRemoveBg,
  };
}
