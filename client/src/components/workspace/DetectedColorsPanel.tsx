import { Palette } from "lucide-react";
import ColorInput from "./ColorInput";
import type { DetectedColor } from "@/lib/recolor";

const MAX_VISIBLE_SWATCHES = 6;

interface DetectedColorsPanelProps {
  detectedColors: DetectedColor[];
  colorOverrides: Record<string, string>;
  setColorOverride: (id: string, hex: string) => void;
}

/** Sección "Colores detectados" del Studio: los swatches con los
 * colores reales del SVG (agrupados por familia) y un selector por
 * cada uno para recolorear conservando el sombreado. */
export default function DetectedColorsPanel({
  detectedColors,
  colorOverrides,
  setColorOverride,
}: DetectedColorsPanelProps) {
  const visibleSwatches = detectedColors.slice(0, MAX_VISIBLE_SWATCHES);
  const remainingCount = detectedColors.length - visibleSwatches.length;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 text-xs font-bold text-[#0C1330]">
        <Palette size={14} className="text-[#1652F5]" /> Colores detectados
      </div>
      {detectedColors.length === 0 ? (
        <p className="mt-2 text-[11px] text-[#9AA1B2]">
          Genera una preview para ver los colores del trazo.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSwatches.map(color => (
                <span
                  key={color.id}
                  title={colorOverrides[color.id] ?? `#${color.hex}`}
                  className="h-6 w-6 shrink-0 rounded-full border border-[#DEDDD3]"
                  style={{
                    backgroundColor: colorOverrides[color.id] ?? `#${color.hex}`,
                  }}
                />
              ))}
              {remainingCount > 0 && (
                <span className="flex h-6 shrink-0 items-center justify-center rounded-full border border-[#C8E93F] bg-[#F2F9DA] px-2 text-[10px] font-bold text-[#5F7A0C]">
                  +{remainingCount}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-[#7A8194]">
              Cambia cualquier color conservando su sombreado. Cada selector
              empieza en el color que ya tiene la imagen.
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
        </>
      )}
    </div>
  );
}
