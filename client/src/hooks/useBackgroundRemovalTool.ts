import { useState } from "react";
import { toast } from "sonner";
import { removeBackgroundApi, type RemoveBgQuality } from "@/lib/api";

/** Encapsula la herramienta "Quitar fondo" independiente del Studio
 * (distinta del toggle "quitar fondo antes de vectorizar" de
 * useVectorizeParams): calidad elegida, resultado en curso y la
 * petición en sí. */
export function useBackgroundRemovalTool(file: File | null) {
  const [bgQuality, setBgQuality] = useState<RemoveBgQuality>("high");
  const [removingBg, setRemovingBg] = useState(false);
  const [removedBgUrl, setRemovedBgUrl] = useState<string | null>(null);

  const clearRemovedBg = () => {
    if (removedBgUrl) URL.revokeObjectURL(removedBgUrl);
    setRemovedBgUrl(null);
  };

  const removeBackground = async () => {
    if (!file) return toast.info("Carga una imagen primero.");
    setRemovingBg(true);
    try {
      const blob = await removeBackgroundApi(file, bgQuality);
      clearRemovedBg();
      setRemovedBgUrl(URL.createObjectURL(blob));
      toast.success("Fondo eliminado.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo quitar el fondo. Intenta de nuevo."
      );
    } finally {
      setRemovingBg(false);
    }
  };

  return { bgQuality, setBgQuality, removingBg, removedBgUrl, removeBackground, clearRemovedBg };
}
