import { describe, expect, it } from "vitest";
import { detectColors, recolorSvg } from "./recolor";

describe("detectColors", () => {
  it("agrupa dos azules casi iguales en una sola familia", () => {
    const svg = `
      <path fill="#1652F5" d="..."/>
      <path fill="#1755F8" d="..."/>
    `;
    const colors = detectColors(svg);
    expect(colors).toHaveLength(1);
    expect(colors[0].members).toHaveLength(2);
  });

  it("un rojo claramente distinto queda en su propia familia", () => {
    const svg = `
      <path fill="#1652F5" d="..."/>
      <path fill="#E01E1E" d="..."/>
    `;
    const colors = detectColors(svg);
    expect(colors).toHaveLength(2);
  });

  it("excluye el color de fondo indicado", () => {
    const svg = `
      <path fill="#FFFFFF" d="..."/>
      <path fill="#0C1330" d="..."/>
    `;
    const colors = detectColors(svg, "#FFFFFF");
    expect(colors).toHaveLength(1);
    expect(colors[0].hex).toBe("0C1330");
  });

  it("ordena las familias por frecuencia de uso, mas frecuente primero", () => {
    const svg = `
      <path fill="#E01E1E" d="a"/>
      <path fill="#1652F5" d="b"/>
      <path fill="#1652F5" d="c"/>
      <path fill="#1652F5" d="d"/>
    `;
    const colors = detectColors(svg);
    expect(colors[0].hex).toBe("1652F5");
  });
});

describe("recolorSvg", () => {
  it("reemplaza solo los fills del color con override", () => {
    const svg = '<path fill="#1652F5"/><path fill="#E01E1E"/>';
    const colors = detectColors(svg);
    const blue = colors.find(c => c.hex === "1652F5")!;
    const result = recolorSvg(svg, colors, { [blue.id]: "#00FF00" });
    expect(result).toContain('fill="#E01E1E"');
    expect(result).not.toContain('fill="#1652F5"');
  });

  it("respeta excludeHex y no toca el color de fondo", () => {
    const svg = '<path fill="#FFFFFF"/><path fill="#1652F5"/>';
    const colors = detectColors(svg, "#FFFFFF");
    const blue = colors[0];
    const result = recolorSvg(svg, colors, { [blue.id]: "#00FF00" }, "#FFFFFF");
    expect(result).toContain('fill="#FFFFFF"');
  });

  it("conserva el desplazamiento de luminosidad relativo dentro de un grupo", () => {
    // dos azules de distinta luminosidad, misma familia -- tras
    // recolorear a verde, el mas oscuro debe seguir siendo mas oscuro
    // que el mas claro dentro del nuevo color.
    const svg = '<path fill="#0F3ACC"/><path fill="#3D6BF5"/>';
    const colors = detectColors(svg);
    expect(colors).toHaveLength(1);
    const group = colors[0];
    const result = recolorSvg(svg, colors, { [group.id]: "#00A000" });
    const fills = Array.from(result.matchAll(/fill="#([0-9A-Fa-f]{6})"/g)).map(m => m[1]);
    expect(fills).toHaveLength(2);
    expect(fills[0]).not.toBe(fills[1]);
  });

  it("no toca colores sin entrada en overrides", () => {
    const svg = '<path fill="#1652F5"/>';
    const colors = detectColors(svg);
    const result = recolorSvg(svg, colors, {});
    expect(result).toBe(svg);
  });
});
