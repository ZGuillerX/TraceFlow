import { ChevronDown, Hand, Maximize } from "lucide-react";
import RangeSlider from "../RangeSlider";

interface CanvasZoomBarProps {
  zoom: number;
  setZoom: (v: number) => void;
  zoomTool: "hand" | "fit";
  setZoomTool: (t: "hand" | "fit") => void;
  onFitToScreen: () => void;
}

/** Barra inferior del lienzo: porcentaje de zoom, herramienta mano y
 * botón de ajustar a pantalla, más el slider de zoom en sí. */
export default function CanvasZoomBar({
  zoom,
  setZoom,
  zoomTool,
  setZoomTool,
  onFitToScreen,
}: CanvasZoomBarProps) {
  return (
    <div className="font-technical mt-3 flex flex-wrap items-center justify-between gap-2 border border-[#DEDDD3] bg-[#FBFBF7] px-3 py-2 text-[11px] text-[#7A8194]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[#0C1330]">
          {zoom}% <ChevronDown size={12} />
        </span>
        <button
          onClick={() => setZoomTool("hand")}
          aria-label="Herramienta mano"
          aria-pressed={zoomTool === "hand"}
          className={`flex h-7 w-7 items-center justify-center border ${zoomTool === "hand" ? "border-[#0C1330] bg-[#0C1330] text-white" : "border-[#DEDDD3] bg-white text-[#0C1330] hover:border-[#0C1330]"}`}
        >
          <Hand size={14} />
        </button>
        <button
          onClick={onFitToScreen}
          aria-label="Ajustar a pantalla"
          className="flex h-7 w-7 items-center justify-center border border-[#DEDDD3] bg-white text-[#0C1330] hover:border-[#0C1330]"
        >
          <Maximize size={14} />
        </button>
      </div>
      <RangeSlider min={25} max={200} value={zoom} onChange={setZoom} className="w-32" />
    </div>
  );
}
