import { X } from "lucide-react";
import { formatBytes } from "@/lib/format";

interface SourceChipProps {
  file: File;
  previewUrl: string | null;
  dims: { w: number; h: number } | null;
  processing: boolean;
  onRemove: () => void;
}

/** Chip con la miniatura, nombre, dimensiones y peso del archivo
 * cargado en el Studio, junto al botón de quitarlo. */
export default function SourceChip({
  file,
  previewUrl,
  dims,
  processing,
  onRemove,
}: SourceChipProps) {
  return (
    <div className="flex items-center gap-2 border border-[#DEDDD3] bg-[#FAF9F5] py-1 pl-1 pr-2">
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          draggable={false}
          className="checkerboard h-7 w-7 shrink-0 border border-[#E3E2D9] object-cover"
        />
      )}
      <span className="max-w-[140px] truncate text-[11px] font-bold text-[#0C1330]">
        {file.name}
      </span>
      <span className="font-technical whitespace-nowrap text-[10px] text-[#7A8194]">
        {dims ? `${dims.w}×${dims.h}` : "…"} · {formatBytes(file.size)}
      </span>
      <button
        onClick={onRemove}
        disabled={processing}
        aria-label="Quitar imagen"
        className="text-[#7A8194] hover:text-[#0C1330] disabled:opacity-40"
      >
        <X size={12} />
      </button>
    </div>
  );
}
