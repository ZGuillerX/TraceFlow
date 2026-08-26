import { Eraser, HelpCircle, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import HintButton from "./HintButton";
import RangeSlider from "../RangeSlider";

const SWITCH_STYLE = {
  className: "data-[state=checked]:bg-[#0C1330]",
  thumbClassName: "data-[state=checked]:bg-[#D8F646]",
};

interface VectorizeSettingsProps {
  detail: number;
  setDetail: (v: number) => void;
  autoColors: boolean;
  setAutoColors: (v: boolean) => void;
  colors: number;
  setColors: (v: number) => void;
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
  tipText: string;
  openHint: string | null;
  onToggleHint: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Controles de trazado del Studio cuando la herramienta activa es
 * "vectorize": nivel de detalle, suavizado de curvas, umbral de
 * colores, detección automática de colores y si se quita el fondo
 * antes de vectorizar. */
export default function VectorizeSettings({
  detail,
  setDetail,
  autoColors,
  setAutoColors,
  colors,
  setColors,
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
  tipText,
  openHint,
  onToggleHint,
}: VectorizeSettingsProps) {
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C1330]">
        Nivel de detalle
        <HintButton id="detail" openHint={openHint} onToggle={onToggleHint} />
        <span className="ml-auto text-[#0C1330]">{detail}%</span>
      </div>
      <RangeSlider
        min={10}
        max={100}
        value={detail}
        onChange={setDetail}
        className="mt-3"
      />
      <div className="my-4 hairline" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="auto-smoothing"
            className="text-xs font-bold text-[#0C1330]"
          >
            Suavizado automático
          </label>
          <HintButton
            id="curveSmoothing"
            openHint={openHint}
            onToggle={onToggleHint}
          />
        </div>
        <Switch
          id="auto-smoothing"
          checked={autoSmoothing}
          onCheckedChange={setAutoSmoothing}
          {...SWITCH_STYLE}
        />
      </div>
      <label
        className={`mt-3 block text-xs font-bold ${autoSmoothing ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
      >
        Suavizado de curvas{" "}
        <span
          className={`float-right ${autoSmoothing ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
        >
          {curveSmoothing}%
        </span>
      </label>
      <RangeSlider
        min={0}
        max={100}
        value={curveSmoothing}
        disabled={autoSmoothing}
        onChange={setCurveSmoothing}
        className="mt-3"
      />
      <div className="my-4 hairline" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="auto-threshold"
            className="text-xs font-bold text-[#0C1330]"
          >
            Umbral automático
          </label>
          <HintButton
            id="colorThreshold"
            openHint={openHint}
            onToggle={onToggleHint}
          />
        </div>
        <Switch
          id="auto-threshold"
          checked={autoThreshold}
          onCheckedChange={setAutoThreshold}
          {...SWITCH_STYLE}
        />
      </div>
      <label
        className={`mt-3 block text-xs font-bold ${autoThreshold ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
      >
        Umbral de colores{" "}
        <span
          className={`float-right ${autoThreshold ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
        >
          {colorThreshold}
        </span>
      </label>
      <RangeSlider
        min={0}
        max={100}
        value={colorThreshold}
        disabled={autoThreshold}
        onChange={setColorThreshold}
        className="mt-3"
      />
      <div className="my-4 hairline" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="auto-colors"
            className="flex items-center gap-2 text-xs font-bold text-[#0C1330]"
          >
            <Wand2 size={15} className="text-[#1652F5]" /> Detectar colores
            automáticamente
          </label>
          <HintButton
            id="autoColors"
            openHint={openHint}
            onToggle={onToggleHint}
          />
        </div>
        <Switch
          id="auto-colors"
          checked={autoColors}
          onCheckedChange={setAutoColors}
          {...SWITCH_STYLE}
        />
      </div>
      <label
        className={`mt-3 block text-xs font-bold ${autoColors ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
      >
        Grupos de color{" "}
        <span
          className={`float-right ${autoColors ? "text-[#B3B8C4]" : "text-[#0C1330]"}`}
        >
          {colors}
        </span>
      </label>
      <RangeSlider
        min={2}
        max={50}
        value={colors}
        disabled={autoColors}
        onChange={setColors}
        className="mt-3"
      />
      <div className="my-4 hairline" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="remove-bg"
            className="flex items-center gap-2 text-xs font-bold text-[#0C1330]"
          >
            <Eraser size={15} className="text-[#1652F5]" /> Quitar fondo
            antes de vectorizar
          </label>
          <HintButton
            id="removeBg"
            openHint={openHint}
            onToggle={onToggleHint}
          />
        </div>
        <Switch
          id="remove-bg"
          checked={removeBg}
          onCheckedChange={setRemoveBg}
          {...SWITCH_STYLE}
        />
      </div>
      <div className="mt-4 flex items-start gap-2.5 border border-[#E3E2D9] bg-white p-3">
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-[#9AA1B2]" />
        <div>
          <div className="font-technical text-[9px] font-bold uppercase tracking-[.15em] text-[#9AA1B2]">
            Consejo
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#7A8194]">
            {tipText}
          </p>
        </div>
      </div>
    </>
  );
}
