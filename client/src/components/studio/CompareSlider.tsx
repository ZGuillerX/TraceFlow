import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface CompareSliderProps {
  file: File;
  rightLabel: string;
  rightBadge?: string;
  checkerboard?: boolean;
  onClose?: () => void;
  children: ReactNode;
}

/** Comparador Original / resultado con un divisor deslizable: arrastrando
 * el handle central se revela mas de un lado u otro. El lado derecho se
 * recorta con clip-path segun la posicion del handle (0-100). El
 * contenido del lado derecho (SVG o imagen) lo arma el llamador --
 * este componente solo se encarga del layout y el arrastre. */
export default function CompareSlider({
  file,
  rightLabel,
  rightBadge,
  checkerboard = true,
  onClose,
  children,
}: CompareSliderProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="w-full max-w-[480px] select-none">
      <div className="flex min-h-10 items-center justify-between gap-2 border border-[#DEDDD3] bg-white px-3 py-1.5">
        <div className="font-technical bg-white px-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330]">
          Original
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-technical bg-white px-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330]">
            {rightLabel}
          </span>
          {rightBadge && (
            <span className="font-technical bg-[#D8F646] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#0C1330]">
              {rightBadge}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="flex h-7 w-7 items-center justify-center border border-[#DEDDD3] bg-white text-[#0C1330] hover:bg-[#0C1330] hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative h-[260px] w-full overflow-hidden border-x border-b border-[#DEDDD3] shadow-[0_15px_35px_rgba(12,19,48,.1)] sm:h-[380px] ${checkerboard ? "checkerboard" : "bg-white"}`}
      >
        {originalUrl && (
          <img
            src={originalUrl}
            alt="Original"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain p-6"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          />
        )}

        <div
          className="absolute inset-0 h-full w-full overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          {children}
        </div>

        <div
          onPointerDown={e => {
            // evita que el pan del lienzo (herramienta "mano") capture
            // este mismo arrastre por burbujeo del evento.
            e.stopPropagation();
            dragging.current = true;
            updateFromClientX(e.clientX);
          }}
          className="absolute inset-y-0 z-20 flex w-8 -translate-x-1/2 cursor-ew-resize items-center justify-center touch-none"
          style={{ left: `${position}%` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(12,19,48,.2)]" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DEDDD3] bg-white text-[#0C1330] shadow-md">
            ↔
          </div>
        </div>
      </div>
    </div>
  );
}
