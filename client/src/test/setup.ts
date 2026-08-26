import "@testing-library/jest-dom";

// jsdom no implementa createObjectURL/revokeObjectURL -- varios
// componentes los usan para previsualizar archivos/blobs locales.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock-url";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}
