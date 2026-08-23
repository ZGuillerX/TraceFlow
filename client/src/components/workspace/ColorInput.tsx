import { useEffect, useState } from "react";

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

interface ColorInputProps {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}

/** Selector de un color: el swatch visual (picker nativo) y un campo
 * de texto para escribir el codigo hex a mano, sincronizados entre
 * si. El texto solo se aplica cuando es un hex valido de 6 digitos
 * (al perder el foco o presionar Enter) -- mientras el usuario esta
 * a mitad de escribir un valor incompleto, no se dispara ningun
 * recoloreado. */
export default function ColorInput({ value, onChange, label }: ColorInputProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (!HEX_RE.test(trimmed)) {
      setText(value);
      return;
    }
    onChange(("#" + trimmed.replace("#", "")).toUpperCase());
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-11 cursor-pointer border border-[#cbd3df] bg-white p-1"
        aria-label={`Selector de color para ${label}`}
      />
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="#RRGGBB"
        maxLength={7}
        className="w-24 border border-[#cbd3df] bg-white px-2 py-1.5 text-xs font-bold uppercase text-[#101A46]"
        aria-label={`Escribir codigo hex para ${label}`}
      />
    </div>
  );
}
