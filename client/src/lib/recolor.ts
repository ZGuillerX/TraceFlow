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

/** Compara dos colores por matiz en vez de RGB crudo: mismo matiz con
 * distinto brillo (una sombra/degradado del mismo trazo) cuenta como
 * el mismo color perceptual, un matiz distinto no. Los colores casi
 * sin saturación (grises, negro de un contorno) se comparan por
 * luminosidad, porque ahí el matiz es ruido sin significado visual.
 * Mismo criterio que detect_color_count en el backend
 * (backend/pipeline/quantize.py), para que "cuántos colores tiene la
 * imagen" signifique lo mismo en los dos lados. */
function sameColorFamily(
  h1: number,
  s1: number,
  l1: number,
  h2: number,
  s2: number,
  l2: number,
  hueTolerance = 0.01,
  achromaticSat = 0.15
): boolean {
  if (s1 < achromaticSat && s2 < achromaticSat) return Math.abs(l1 - l2) < 0.25;
  if (s1 < achromaticSat || s2 < achromaticSat) return false;
  const hueDist = Math.min(Math.abs(h1 - h2), 1 - Math.abs(h1 - h2));
  return hueDist < hueTolerance;
}

export interface DetectedColor {
  /** Identificador estable del grupo: el hex representativo (el mas
   * frecuente entre sus miembros). Es lo que debe mostrar el selector
   * de color por defecto, para que el usuario vea el color que ya
   * tiene la imagen en vez de un valor arbitrario. */
  id: string;
  hex: string;
  /** Todos los fill hex reales del SVG que pertenecen a esta familia
   * de color (p. ej. las distintas bandas de sombreado de un mismo
   * trazo). */
  members: string[];
}

/** Detecta las familias de color reales que tiene el SVG (agrupando
 * por matiz, no por hex exacto), para poder ofrecer un selector por
 * cada una en vez de uno solo que repinte todo. excludeHex deja fuera
 * el color de fondo (modo "con fondo"). */
export function detectColors(
  svg: string,
  excludeHex?: string | null
): DetectedColor[] {
  const exclude = excludeHex?.replace("#", "").toUpperCase();
  const counts = new Map<string, number>();
  Array.from(svg.matchAll(/fill="#([0-9A-Fa-f]{6})"/g)).forEach(m => {
    const upper = m[1].toUpperCase();
    if (upper === exclude) return;
    counts.set(upper, (counts.get(upper) ?? 0) + 1);
  });

  const hexes = Array.from(counts.keys());
  const hsls = hexes.map(hex => rgbToHsl(...hexToRgb(hex)));
  const parent = hexes.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const [h1, s1, l1] = hsls[i];
      const [h2, s2, l2] = hsls[j];
      if (sameColorFamily(h1, s1, l1, h2, s2, l2)) {
        const ri = find(i),
          rj = find(j);
        if (ri !== rj) parent[ri] = rj;
      }
    }
  }

  const groups = new Map<number, string[]>();
  for (let i = 0; i < hexes.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(hexes[i]);
  }

  return Array.from(groups.values())
    .map(members => {
      const representative = members.reduce((best: string, hex: string) =>
        (counts.get(hex) ?? 0) > (counts.get(best) ?? 0) ? hex : best
      );
      return { id: representative, hex: representative, members };
    })
    .sort((a, b) => {
      const total = (m: string[]) =>
        m.reduce((sum, hex) => sum + (counts.get(hex) ?? 0), 0);
      return total(b.members) - total(a.members);
    });
}

/** Repinta el SVG segun overrides: para cada color detectado con una
 * entrada en overrides (por su id), cambia el matiz de todos sus
 * miembros al del color elegido, conservando la luminosidad original
 * de cada uno (mantiene el sombreado/degradado en vez de aplanarlo).
 * Los colores sin entrada en overrides quedan intactos -- asi el
 * usuario puede cambiar solo el color que le interesa, no todos a la
 * vez. excludeHex deja intacto el fondo (modo "con fondo"). */
export function recolorSvg(
  svg: string,
  colors: DetectedColor[],
  overrides: Record<string, string>,
  excludeHex?: string | null
): string {
  const exclude = excludeHex?.replace("#", "").toUpperCase();

  const targetByMember = new Map<string, [number, number]>();
  for (const color of colors) {
    const target = overrides[color.id];
    if (!target) continue;
    const [targetH, , targetS] = rgbToHsl(...hexToRgb(target));
    for (const member of color.members) {
      targetByMember.set(member, [targetH, targetS]);
    }
  }

  return svg.replace(/fill="#([0-9A-Fa-f]{6})"/g, (match, hex: string) => {
    const upper = hex.toUpperCase();
    if (upper === exclude) return match;
    const target = targetByMember.get(upper);
    if (!target) return match;
    const [, , lightness] = rgbToHsl(...hexToRgb(hex));
    const [nr, ng, nb] = hslToRgb(target[0], target[1], lightness);
    return `fill="#${toHex(nr)}${toHex(ng)}${toHex(nb)}"`;
  });
}
