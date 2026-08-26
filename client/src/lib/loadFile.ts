import { toast } from "sonner";

/** Patrón común de "cargar un archivo nuevo": si hay archivo, lo
 * guarda, limpia cualquier resultado derivado del archivo anterior
 * (onLoaded) y muestra el toast de éxito -- usado tanto en el Studio
 * como en la herramienta standalone de quitar fondo, cada uno con su
 * propio estado a resetear y su propio mensaje. */
export function commitFileLoad(
  f: File | undefined,
  setFile: (file: File) => void,
  onLoaded: (file: File) => void,
  successMessage: string
): void {
  if (!f) return;
  setFile(f);
  onLoaded(f);
  toast.success(successMessage);
}
