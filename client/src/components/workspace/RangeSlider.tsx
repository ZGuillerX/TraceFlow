/** Slider a medida: track fino + relleno verde lima + thumb rectangular
 * navy, en vez del control nativo del navegador (circulo). El input
 * real queda invisible encima para conservar arrastre, teclado y
 * accesibilidad. */
export default function RangeSlider({
  min,
  max,
  value,
  onChange,
  disabled,
  className,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`relative h-[18px] ${className ?? ""}`}>
      <span className="absolute left-0 right-0 top-[7px] h-[9px] bg-[#E1E0D6]" />
      <span
        className="absolute top-[7px] h-[9px]"
        style={{ width: `${pct}%`, background: disabled ? "#E6E5DB" : "#D8F646" }}
      />
      <span
        className="absolute top-0.5 h-[17px] w-[17px] rounded border-2 border-[#0C1330]"
        style={{
          left: `calc(${pct}% - 6.5px)`,
          background: disabled ? "#B9B8AE" : "#0C1330",
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="relative z-10 h-[18px] w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}
