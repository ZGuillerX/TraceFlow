import { toast } from "sonner";
import { isAcceptedImage } from "@/lib/fileValidation";

/** Carga un archivo nuevo, valida su tipo, guarda el archivo,
 * limpia el resultado anterior y muestra un mensaje de éxito.
 * Aplica tanto a input como a drag&drop, evitando duplicar lógica.
 */
export function commitFileLoad(
  f: File | undefined,
  setFile: (file: File) => void,
  onLoaded: (file: File) => void,
  successMessage: string
): void {
  if (!f) return;
  if (!isAcceptedImage(f)) {
    toast.error("Solo se aceptan imágenes PNG, JPG o WEBP.");
    return;
  }
  setFile(f);
  onLoaded(f);
  toast.success(successMessage);
}