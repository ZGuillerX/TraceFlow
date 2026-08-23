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

export interface VectorizeStageEvent {
  stage: string;
  svg?: string;
  bgHex?: string | null;
  message?: string;
}

/** Igual que vectorizeImage, pero via /api/vectorize/stream: llama a
 * onStage con el nombre de cada etapa del pipeline segun se completa
 * (para la barra de progreso en vivo), y devuelve el mismo resultado
 * final al terminar. No se puede usar EventSource (no soporta POST con
 * body) -- se lee el stream a mano con getReader() y se parsean los
 * bloques "data: ...\n\n" (formato SSE) segun llegan. */
export async function vectorizeImageStream(
  file: File,
  opts: VectorizeOptions,
  onStage: (event: VectorizeStageEvent) => void,
  signal?: AbortSignal
): Promise<VectorizeResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("detail", String(opts.detail));
  body.append("colors", String(opts.colors));
  body.append("auto_colors", String(opts.autoColors));
  body.append("remove_bg", String(opts.removeBg));

  const res = await fetch("/api/vectorize/stream", { method: "POST", body, signal });
  if (!res.ok || !res.body) {
    throw new Error(
      await extractErrorMessage(
        res,
        "No se pudo vectorizar la imagen. Intenta de nuevo."
      )
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: VectorizeResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const event: VectorizeStageEvent = JSON.parse(part.slice(6));
      if (event.stage === "error") {
        throw new Error(
          event.message || "No se pudo vectorizar la imagen. Intenta de nuevo."
        );
      }
      onStage(event);
      if (event.stage === "final" && event.svg !== undefined) {
        result = { svg: event.svg, bgHex: event.bgHex ?? null };
      }
    }
  }

  if (!result) {
    throw new Error("No se pudo vectorizar la imagen. Intenta de nuevo.");
  }
  return result;
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
