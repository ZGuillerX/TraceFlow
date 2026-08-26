import type { RemoveBgQuality } from "@/lib/api";

interface QualitySelectorProps {
  value: RemoveBgQuality;
  onChange: (q: RemoveBgQuality) => void;
  className?: string;
}

/** Selector de calidad rápida/alta para quitar fondo -- mismo control
 * usado en el Studio (SettingsPanel) y en la herramienta standalone
 * (BackgroundRemover), con la misma paleta en ambos contextos. */
export default function QualitySelector({ value, onChange, className }: QualitySelectorProps) {
  return (
    <div className={`flex border border-[#DEDDD3] bg-white p-1 ${className ?? ""}`}>
      <button
        onClick={() => onChange("fast")}
        className={`flex-1 px-3 py-2 text-xs font-bold ${value === "fast" ? "bg-[#1652F5] text-white" : "text-[#7A8194]"}`}
      >
        Rápida
      </button>
      <button
        onClick={() => onChange("high")}
        className={`flex-1 px-3 py-2 text-xs font-bold ${value === "high" ? "bg-[#1652F5] text-white" : "text-[#7A8194]"}`}
      >
        Alta calidad
      </button>
    </div>
  );
}
