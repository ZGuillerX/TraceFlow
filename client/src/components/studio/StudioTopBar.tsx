import { Link } from "wouter";
import { Moon, Settings2 } from "lucide-react";
import { toast } from "sonner";
import mark from "@/assets/mark.svg";

const MENUS = ["Archivo", "Editar", "Ver", "Ayuda"];

/** Header oscuro del Studio, look de editor de escritorio -- reemplaza el
 * sidebar de TraceFlowShell solo en esta pagina. Los menus Archivo/Editar/
 * Ver/Ayuda son decorativos por ahora. */
export default function StudioTopBar() {
  return (
    <header className="flex h-14 items-center justify-between bg-[#0B0F1F] px-5 text-white">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <img src={mark} alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-lg uppercase tracking-[.03em] text-white">
            TraceFlow
          </span>
        </Link>
        <nav className="font-technical flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[.12em] text-white/70">
          {MENUS.map(label => (
            <button
              key={label}
              onClick={() => toast.info(`${label} disponible próximamente.`)}
              className="hover:text-white"
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => toast.info("Ajustes disponibles próximamente.")}
          className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Ajustes"
        >
          <Settings2 size={16} />
        </button>
        <button
          onClick={() =>
            toast.info("El tema oscuro estará disponible próximamente.")
          }
          className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Cambiar tema"
        >
          <Moon size={16} />
        </button>
      </div>
    </header>
  );
}
