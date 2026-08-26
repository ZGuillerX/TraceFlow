import { useEffect, useState } from "react";

interface ImageDimensions {
  w: number;
  h: number;
}

/** Carga una imagen desde `src` solo para leer sus dimensiones
 * naturales -- util para mostrar "ancho × alto" en un chip de
 * metadatos junto a una preview que ya se renderiza por otro medio. */
export function useImageDimensions(src: string | null): ImageDimensions | null {
  const [dims, setDims] = useState<ImageDimensions | null>(null);

  useEffect(() => {
    if (!src) {
      setDims(null);
      return;
    }
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  return dims;
}
