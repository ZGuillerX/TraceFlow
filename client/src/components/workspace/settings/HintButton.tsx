import { Info } from "lucide-react";

interface HintButtonProps {
  id: string;
  openHint: string | null;
  onToggle: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

// definido fuera de los componentes que lo usan: si se anida dentro
// del render de otro, React lo ve como un tipo de componente nuevo en
// cada render (la funcion se recrea) y lo remonta en vez de
// reutilizarlo.
export default function HintButton({ id, openHint, onToggle }: HintButtonProps) {
  return (
    <button
      type="button"
      onClick={e => onToggle(id, e)}
      aria-label="Más información"
      aria-expanded={openHint === id}
      className="shrink-0 text-[#9AA1B2] hover:text-[#1652F5]"
    >
      <Info size={13} />
    </button>
  );
}
