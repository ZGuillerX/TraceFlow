const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// Filtro inicial por extensión/MIME para evitar previsualizar archivos que no sean imágenes; la validación real se hace en el backend.
export function isAcceptedImage(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext));
}