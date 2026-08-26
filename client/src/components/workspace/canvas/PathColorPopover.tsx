import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface PathColorPopoverProps {
  x: number;
  y: number;
  hex: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

/** Popover flotante que aparece junto al trazo clickeado en modo
 * "seleccionar": deja cambiar el color de ESE trazo puntual, sin
 * afectar a otros trazos que hoy compartan el mismo color (a
 * diferencia del recoloreado por familia del panel "Colores
 * detectados"). Se cierra con click afuera o con el botón X. */
export default function PathColorPopover({
  x,
  y,
  hex,
  onChange,
  onClose,
}: PathColorPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ left: x, top: y }}
      className="absolute z-40 flex items-center gap-2 border border-[#DEDDD3] bg-white p-2 shadow-[0_15px_35px_rgba(12,19,48,.15)]"
    >
      <input
        type="color"
        value={hex}
        onChange={e => onChange(e.target.value)}
        autoFocus
        className="h-8 w-10 cursor-pointer border border-[#DEDDD3] bg-white p-1"
        aria-label="Color de este trazo"
      />
      <span className="font-technical text-[11px] font-bold uppercase text-[#0C1330]">
        {hex}
      </span>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="text-[#7A8194] hover:text-[#0C1330]"
      >
        <X size={13} />
      </button>
    </div>
  );
}
