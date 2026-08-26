import { useEffect, useRef, useState, type ReactNode } from "react";

interface CompareSliderProps {
  file: File;
  rightLabel: string;
  rightBadge?: string;
  checkerboard?: boolean;
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
    <div
      ref={containerRef}
      className={`relative h-[380px] w-full max-w-[480px] select-none overflow-hidden border border-[#DEDDD3] shadow-[0_15px_35px_rgba(12,19,48,.1)] ${checkerboard ? "checkerboard" : "bg-white"}`}
    >
      <div className="font-technical absolute left-4 top-4 z-10 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330] shadow-sm">
        Original
      </div>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
        <span className="font-technical bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#0C1330] shadow-sm">
          {rightLabel}
        </span>
        {rightBadge && (
          <span className="font-technical bg-[#D8F646] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#0C1330] shadow-sm">
            {rightBadge}
          </span>
        )}
      </div>

      {originalUrl && (
        <img
          src={originalUrl}
          alt="Original"
          className="absolute inset-0 h-full w-full object-contain p-6"
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
  );
}
