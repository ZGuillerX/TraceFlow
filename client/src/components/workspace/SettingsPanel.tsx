import { useRef, useState } from "react";
import HintButton from "./HintButton";
import QualitySelector from "./QualitySelector";
import ToolSwitcher from "./ToolSwitcher";
import VectorizeSettings from "./VectorizeSettings";
import type { RemoveBgQuality } from "@/lib/api";
import type { StudioTool } from "./PreviewCanvas";

interface SettingsPanelProps {
  tool: StudioTool;
  setTool: (t: StudioTool) => void;
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
  bgQuality: RemoveBgQuality;
  setBgQuality: (q: RemoveBgQuality) => void;
}

const HINTS: Record<string, string> = {
  header:
    "Ajusta el detalle de trazado para equilibrar calidad y peso del archivo.",
  detail: "Más detalle conserva bordes pequeños y textura.",
  autoColors:
    "Analiza la imagen y elige cuántos colores usar. Apágalo para controlarlo tú mismo.",
  curveSmoothing:
    "Qué tan redondeadas salen las curvas. Apágalo para fijar tú mismo el nivel de suavizado.",
  colorThreshold:
    "Qué tan distintos deben ser dos colores para quedar en capas separadas. Apágalo para fijar tú mismo el umbral.",
  removeBg:
    "El SVG sale con fondo transparente en vez de un color sólido de fondo. Tarda unos segundos más.",
  quality:
    "Rápida usa un modelo más liviano (~35% más rápido). Alta calidad es más lenta pero sin huecos de transparencia en detalles oscuros.",
};

/** Panel de controles del Studio: cuando la herramienta es "vectorize"
 * muestra nivel de detalle, grupos de color y quitar fondo antes de
 * vectorizar (VectorizeSettings); cuando es "remove-bg" muestra solo
 * el selector de calidad. Al fondo, el selector de herramienta que
 * alterna entre ambos flujos dentro del mismo Studio. */
export default function SettingsPanel({
  tool,
  setTool,
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
  bgQuality,
  setBgQuality,
}: SettingsPanelProps) {
  const [openHint, setOpenHint] = useState<string | null>(null);
  const [hintTop, setHintTop] = useState(0);
  const asideRef = useRef<HTMLElement>(null);

  // el popover se ancla al panel completo (no al icono que lo abrio)
  // para que nunca se salga por los lados de un panel tan angosto --
  // solo se calcula su posicion vertical, cerca del boton clickeado.
  const onToggleHint = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openHint === id) {
      setOpenHint(null);
      return;
    }
    const btnRect = e.currentTarget.getBoundingClientRect();
    const asideRect = asideRef.current!.getBoundingClientRect();
    setHintTop(btnRect.bottom - asideRect.top + 6);
    setOpenHint(id);
  };

  return (
    <aside
      ref={asideRef}
      onClick={() => setOpenHint(null)}
      className="relative border border-[#DEDDD3] bg-[#FAF9F5] p-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-technical eyebrow font-black text-[#0C1330]">
            Ajustes
          </div>
          <h2 className="mt-1 font-display text-base">
            {tool === "vectorize" ? "Controles de trazado" : "Quitar fondo"}
          </h2>
        </div>
      </div>

      {tool === "vectorize" ? (
        <VectorizeSettings
          detail={detail}
          setDetail={setDetail}
          autoColors={autoColors}
          setAutoColors={setAutoColors}
          colors={colors}
          setColors={setColors}
          curveSmoothing={curveSmoothing}
          setCurveSmoothing={setCurveSmoothing}
          autoSmoothing={autoSmoothing}
          setAutoSmoothing={setAutoSmoothing}
          colorThreshold={colorThreshold}
          setColorThreshold={setColorThreshold}
          autoThreshold={autoThreshold}
          setAutoThreshold={setAutoThreshold}
          removeBg={removeBg}
          setRemoveBg={setRemoveBg}
          tipText={HINTS.header}
          openHint={openHint}
          onToggleHint={onToggleHint}
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C1330]">
            Calidad
            <HintButton
              id="quality"
              openHint={openHint}
              onToggle={onToggleHint}
            />
          </div>
          <QualitySelector
            value={bgQuality}
            onChange={setBgQuality}
            variant="studio"
            className="mt-3"
          />
        </>
      )}

      <div className="my-4 hairline" />
      <ToolSwitcher tool={tool} setTool={setTool} />

      {openHint && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute left-4 right-4 z-30 border border-[#DEDDD3] bg-white p-2.5 text-[11px] font-normal leading-relaxed text-[#4B5266] shadow-lg"
          style={{ top: hintTop }}
        >
          {HINTS[openHint]}
        </div>
      )}
    </aside>
  );
}
