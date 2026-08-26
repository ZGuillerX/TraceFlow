import { useEffect } from "react";
import { X } from "lucide-react";

interface ZoomLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  imgClassName?: string;
}

/** Overlay a pantalla completa con una imagen ampliada. Cierra con clic
 * afuera, el botón X o la tecla Escape. */
export default function ZoomLightbox({
  src,
  alt,
  open,
  onClose,
  imgClassName,
}: ZoomLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar vista ampliada"
        className="absolute right-6 top-6 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className={`max-h-full max-w-full object-contain ${imgClassName ?? ""}`}
      />
    </div>
  );
}
