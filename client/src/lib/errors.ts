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
