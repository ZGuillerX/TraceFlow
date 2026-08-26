import { useState, type DragEvent } from "react";

interface UseDropzoneOptions {
  onDrop: (file: File | undefined) => void;
  disabled?: boolean;
}

interface DropzoneHandlers {
  isDragging: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

/** Estado y handlers de arrastrar-y-soltar un archivo sobre un
 * contenedor. `disabled` bloquea el drop -- p. ej. mientras se procesa
 * una imagen, para no interrumpir un trazado en curso soltando una
 * nueva (hay que cancelar primero). */
export function useDropzone({ onDrop, disabled = false }: UseDropzoneOptions): DropzoneHandlers {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    onDrop(e.dataTransfer.files[0]);
  };

  return { isDragging, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop };
}
