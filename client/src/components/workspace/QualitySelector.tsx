import type { RemoveBgQuality } from "@/lib/api";

interface QualitySelectorProps {
  value: RemoveBgQuality;
  onChange: (q: RemoveBgQuality) => void;
  variant: "studio" | "standalone";
  className?: string;
}

const VARIANTS: Record<QualitySelectorProps["variant"], { border: string; active: string; inactive: string; padding: string }> = {
  studio: {
    border: "border-[#DEDDD3]",
    active: "bg-[#1652F5] text-white",
    inactive: "text-[#7A8194]",
    padding: "px-3 py-2",
  },
  standalone: {
    border: "border-[#dfe2ea]",
    active: "bg-[#101A46] text-white",
    inactive: "text-[#7a8299]",
    padding: "px-3 py-1.5",
  },
};

/** Selector de calidad rápida/alta para quitar fondo -- mismo control
 * usado en el Studio (SettingsPanel) y en la herramienta standalone
 * (BackgroundRemover), cada uno con su propia paleta de color vía
 * `variant`, para no forzar un estilo visual común entre ambos. */
export default function QualitySelector({ value, onChange, variant, className }: QualitySelectorProps) {
  const v = VARIANTS[variant];
  return (
    <div className={`flex border ${v.border} bg-white p-1 ${className ?? ""}`}>
      <button
        onClick={() => onChange("fast")}
        className={`flex-1 ${v.padding} text-xs font-bold ${value === "fast" ? v.active : v.inactive}`}
      >
        Rápida
      </button>
      <button
        onClick={() => onChange("high")}
        className={`flex-1 ${v.padding} text-xs font-bold ${value === "high" ? v.active : v.inactive}`}
      >
        Alta calidad
      </button>
    </div>
  );
}
