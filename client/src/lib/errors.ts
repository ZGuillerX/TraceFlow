/** Distingue un 429 (rate limit o limite de concurrencia del backend)
 * de cualquier otro error -- el mensaje crudo del servidor en ese caso
 * ("Ya tienes una vectorizacion en curso...") confunde si el usuario
 * lo ve como un toast de error normal justo despues de cancelar; se
 * maneja aparte con el mismo cooldown local (ver Workspace.tsx).
 * limitType distingue "concurrency" (esta esperando trabajo previo,
 * mensaje confuso justo tras cancelar) de "rate" (limite de tasa real,
 * el mensaje del backend ya es claro) -- via el header X-Limit-Type. */
export class TooManyRequestsError extends Error {
  constructor(
    message: string,
    public readonly limitType: "concurrency" | "rate" | null,
    public readonly retryAfterSeconds: number | null
  ) {
    super(message);
  }
}

/** Extrae el mensaje de error real de una respuesta fallida de la API
 * (FastAPI devuelve {"detail": "..."} en JSON), para mostrarle al
 * usuario el motivo real -- p. ej. un limite de peticiones con cuanto
 * tiene que esperar -- en vez de un mensaje generico siempre igual. */
export async function extractErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // el cuerpo no era JSON valido
  }
  return fallback;
}

/** Lanza el error correspondiente para una respuesta fallida:
 * TooManyRequestsError si es un 429, Error normal en cualquier otro
 * caso -- centraliza esta distincion para que los tres endpoints la
 * apliquen igual. */
export async function throwForFailedResponse(
  res: Response,
  fallback: string
): Promise<never> {
  const message = await extractErrorMessage(res, fallback);
  if (res.status === 429) {
    const limitType = res.headers.get("X-Limit-Type");
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new TooManyRequestsError(
      message,
      limitType === "concurrency" || limitType === "rate" ? limitType : null,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    );
  }
  throw new Error(message);
}
