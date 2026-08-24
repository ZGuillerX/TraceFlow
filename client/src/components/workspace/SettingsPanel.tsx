import {
  ArrowDownToLine,
  ChevronDown,
  Eraser,
  FileImage,
  Palette,
  RefreshCw,
  Wand2,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { DetectedColor } from "@/lib/recolor";
import ColorInput from "./ColorInput";

interface SettingsPanelProps {
  detail: number;
  setDetail: (v: number) => void;
  autoColors: boolean;
  setAutoColors: (v: boolean) => void;
  colors: number;
  setColors: (v: number) => void;
  removeBg: boolean;
  setRemoveBg: (v: boolean) => void;
  detectedColors: DetectedColor[];
  colorOverrides: Record<string, string>;
  setColorOverride: (id: string, hex: string) => void;
  processing: boolean;
  process: () => void;
  download: () => void;
  cooldownSecondsLeft: number;
}

/** Panel de controles de trazado del workspace de vectorización: nivel
 * de detalle, grupos de color (con detección automática), quitar
 * fondo, colores del trazo detectados, y las acciones de
 * generar/exportar. */
export default function SettingsPanel({
  detail,
  setDetail,
  autoColors,
  setAutoColors,
  colors,
  setColors,
  removeBg,
  setRemoveBg,
  detectedColors,
  colorOverrides,
  setColorOverride,
  processing,
  process,
  download,
  cooldownSecondsLeft,
}: SettingsPanelProps) {
  return (
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
          <Eraser size={15} className="text-[#1687F8]" /> Quitar fondo antes
          de vectorizar
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
      <div className="flex items-center gap-2 text-xs font-bold text-[#101A46]">
        <Palette size={15} className="text-[#1687F8]" /> Colores del trazo
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">
        Cambia cualquier color conservando su sombreado. Cada selector
        empieza en el color que ya tiene la imagen — solo toca los que
        quieras cambiar.
      </p>
      {detectedColors.length === 0 ? (
        <p className="mt-3 text-[11px] text-[#9aa1b2]">
          Genera una preview para ver los colores del trazo.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {detectedColors.map(color => {
            const current = colorOverrides[color.id] ?? `#${color.hex}`;
            return (
              <ColorInput
                key={color.id}
                value={current}
                onChange={hex => setColorOverride(color.id, hex)}
                label={current}
              />
            );
          })}
        </div>
      )}
      <button
        onClick={process}
        disabled={processing || cooldownSecondsLeft > 0}
        className="button-press mt-8 flex w-full items-center justify-center gap-2 bg-[#1687F8] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#0e74dd] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <WandSparkles size={16} />
        )}{" "}
        {processing
          ? "Trazando…"
          : cooldownSecondsLeft > 0
            ? `Espera ${cooldownSecondsLeft}s…`
            : "Generar preview"}
      </button>
      <button
        onClick={download}
        className="button-press mt-2 flex w-full items-center justify-center gap-2 border border-[#cbd3df] bg-white px-4 py-3 text-sm font-bold text-[#101A46] hover:border-[#1687F8]"
      >
        <ArrowDownToLine size={16} /> Exportar SVG
      </button>
    </aside>
  );
}
