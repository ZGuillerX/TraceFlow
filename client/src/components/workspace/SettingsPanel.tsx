import { useRef, useState } from "react";
import { Eraser, HelpCircle, Info, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import RangeSlider from "./RangeSlider";
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
  removeBg: boolean;
  setRemoveBg: (v: boolean) => void;
  bgQuality: RemoveBgQuality;
  setBgQuality: (q: RemoveBgQuality) => void;
}

const SWITCH_STYLE = {
  className: "data-[state=checked]:bg-[#0C1330]",
  thumbClassName: "data-[state=checked]:bg-[#D8F646]",
};

const HINTS: Record<string, string> = {
  header:
    "Ajusta el detalle de trazado para equilibrar calidad y peso del archivo.",
  detail: "Más detalle conserva bordes pequeños y textura.",
  autoColors:
    "Analiza la imagen y elige cuántos colores usar. Apágalo para controlarlo tú mismo.",
  removeBg:
    "El SVG sale con fondo transparente en vez de un color sólido de fondo. Tarda unos segundos más.",
  quality:
    "Rápida usa un modelo más liviano (~35% más rápido). Alta calidad es más lenta pero sin huecos de transparencia en detalles oscuros.",
};

// definido fuera del componente: si se anida dentro del render, React
// lo ve como un tipo de componente nuevo en cada render (porque la
// funcion se recrea) y lo remonta en vez de reutilizarlo.
function HintButton({
  id,
  openHint,
  onToggle,
}: {
  id: string;
  openHint: string | null;
  onToggle: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={e => onToggle(id, e)}
      aria-label="Más información"
      aria-expanded={openHint === id}
      className="shrink-0 text-[#9AA1B2] hover:text-[#1652F5]"
    >
      <Info size={13} />
    </button>
  );
}

/** Panel de controles del Studio: cuando la herramienta es "vectorize"
 * muestra nivel de detalle, grupos de color y quitar fondo antes de
 * vectorizar; cuando es "remove-bg" muestra solo el selector de
 * calidad. Al fondo, el selector de herramienta que alterna entre
 * ambos flujos dentro del mismo Studio. */
export default function SettingsPanel({
  tool,
  setTool,
  detail,
  setDetail,
  autoColors,
  setAutoColors,
  colors,
  setColors,
  removeBg,
  setRemoveBg,
  bgQuality,
  setBgQuality,
}: SettingsPanelProps) {
  // decorativos: se muestran y se mueven, pero nunca se leen en
  // process() -- de momento solo diseño, se conectan mas adelante.
  const [curveSmoothing, setCurveSmoothing] = useState(75);
  const [colorThreshold, setColorThreshold] = useState(60);
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
        <>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C1330]">
            Nivel de detalle
            <HintButton
              id="detail"
              openHint={openHint}
              onToggle={onToggleHint}
            />
            <span className="ml-auto text-[#0C1330]">{detail}%</span>
          </div>
          <RangeSlider
            min={10}
            max={100}
            value={detail}
            onChange={setDetail}
            className="mt-3"
          />
          <label className="mt-4 block text-xs font-bold text-[#0C1330]">
            Suavizado de curvas{" "}
            <span className="float-right text-[#0C1330]">
              {curveSmoothing}%
            </span>
          </label>
          <RangeSlider
            min={0}
            max={100}
            value={curveSmoothing}
            onChange={setCurveSmoothing}
            className="mt-3"
          />
          <label className="mt-3 block text-xs font-bold text-[#0C1330]">
            Umbral de colores{" "}
            <span className="float-right text-[#0C1330]">{colorThreshold}</span>
          </label>
          <RangeSlider
            min={0}
            max={100}
            value={colorThreshold}
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
                {HINTS.header}
              </p>
            </div>
          </div>
        </>
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
          <div className="mt-3 flex border border-[#DEDDD3] bg-white p-1">
            <button
              onClick={() => setBgQuality("fast")}
              className={`flex-1 px-3 py-2 text-xs font-bold ${bgQuality === "fast" ? "bg-[#1652F5] text-white" : "text-[#7A8194]"}`}
            >
              Rápida
            </button>
            <button
              onClick={() => setBgQuality("high")}
              className={`flex-1 px-3 py-2 text-xs font-bold ${bgQuality === "high" ? "bg-[#1652F5] text-white" : "text-[#7A8194]"}`}
            >
              Alta calidad
            </button>
          </div>
        </>
      )}

      <div className="my-4 hairline" />
      <div className="font-technical mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#9AA1B2]">
        Herramienta
      </div>
      <div className="flex border border-[#DEDDD3] bg-white p-1">
        <button
          onClick={() => setTool("vectorize")}
          className={`flex-1 px-3 py-2 text-xs font-bold ${tool === "vectorize" ? "bg-[#0C1330] text-white" : "text-[#7A8194]"}`}
        >
          Vectorizar
        </button>
        <button
          onClick={() => setTool("remove-bg")}
          className={`flex-1 px-3 py-2 text-xs font-bold ${tool === "remove-bg" ? "bg-[#0C1330] text-white" : "text-[#7A8194]"}`}
        >
          Quitar fondo
        </button>
      </div>

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
