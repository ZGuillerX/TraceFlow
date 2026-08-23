function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();

/** Repinta cada fill del SVG al matiz de targetHex, conservando la
 * luminosidad original de cada trazo (mantiene el sombreado/degradado
 * en vez de aplanarlo a un solo color parejo). excludeHex deja intacto
 * ese color (p. ej. el fondo en el modo "con fondo"). */
export function recolorSvg(
  svg: string,
  targetHex: string,
  excludeHex?: string | null
): string {
  const [tr, tg, tb] = hexToRgb(targetHex);
  const [targetH, , targetS] = rgbToHsl(tr, tg, tb);
  const exclude = excludeHex?.replace("#", "").toUpperCase();

  return svg.replace(/fill="#([0-9A-Fa-f]{6})"/g, (match, hex: string) => {
    const upper = hex.toUpperCase();
    if (upper === exclude) return match;
    const [r, g, b] = hexToRgb(hex);
    const [, , lightness] = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(targetH, targetS, lightness);
    return `fill="#${toHex(nr)}${toHex(ng)}${toHex(nb)}"`;
  });
}
