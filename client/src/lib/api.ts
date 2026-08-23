import { extractErrorMessage } from "./errors";

export interface VectorizeOptions {
  detail: number;
  colors: number;
  autoColors: boolean;
  removeBg: boolean;
}

export interface VectorizeResult {
  svg: string;
  bgHex: string | null;
}

/** Manda la imagen a /api/vectorize y devuelve el SVG resultante junto
 * con el color de fondo detectado (modo "con fondo", para que el
 * llamador sepa que color no recolorear). */
export async function vectorizeImage(
  file: File,
  opts: VectorizeOptions
): Promise<VectorizeResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("detail", String(opts.detail));
  body.append("colors", String(opts.colors));
  body.append("auto_colors", String(opts.autoColors));
  body.append("remove_bg", String(opts.removeBg));

  const res = await fetch("/api/vectorize", { method: "POST", body });
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(
        res,
        "No se pudo vectorizar la imagen. Intenta de nuevo."
      )
    );
  }
  return { svg: await res.text(), bgHex: res.headers.get("X-Bg-Color") };
}

/** Manda la imagen a /api/remove-background y devuelve el PNG
 * transparente resultante. */
export async function removeBackgroundApi(file: File): Promise<Blob> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/remove-background", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(
      await extractErrorMessage(res, "No se pudo quitar el fondo. Intenta de nuevo.")
    );
  }
  return res.blob();
}
