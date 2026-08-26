/* TraceFlow / Vector Atelier: archivo de trabajos con estado vacío técnico, píxeles y curva Bézier como señal de producto. */
import { ArrowRight, Clock3, Filter, FolderOpen, Search } from "lucide-react";
import { Link } from "wouter";
import TraceFlowShell from "@/components/layout/TraceFlowShell";
import HistoryEmptyIllustration from "@/components/icons/HistoryEmptyIllustration";
import { toast } from "sonner";

export default function History() {
  return (
    <TraceFlowShell workspace>
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow">Archivo de proyectos</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              Historial
            </h1>
            <p className="mt-2 text-sm text-[#69728a]">
              Tus assets procesados aparecerán aquí.
            </p>
          </div>
          <Link
            href="/workspace"
            className="button-press inline-flex items-center justify-center gap-2 bg-[#1687F8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e74dd]"
          >
            <ArrowRight size={15} /> Nuevo proyecto
          </Link>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-y border-[#dfe2ea] py-4 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 border border-[#dfe2ea] bg-white px-3 py-2 text-sm text-[#9aa1b2]">
            <Search size={15} /> Buscar archivos
          </div>
          <button
            onClick={() =>
              toast.info(
                "Los filtros estarán disponibles cuando haya proyectos."
              )
            }
            className="flex items-center justify-center gap-2 border border-[#dfe2ea] bg-white px-3 py-2 text-xs font-bold text-[#101A46]"
          >
            <Filter size={15} /> Filtrar{" "}
            <span className="text-[#a4abc0]">Todos</span>
          </button>
        </div>
        <div className="relative mt-10 flex min-h-[380px] flex-col items-center justify-center overflow-hidden border border-dashed border-[#cbd3df] bg-white px-6 text-center">
          <div className="pointer-events-none absolute left-12 top-10 grid grid-cols-4 gap-2 opacity-30">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 ${i % 3 === 0 ? "bg-[#1687F8]" : "bg-[#101A46]"}`}
              />
            ))}
          </div>
          <HistoryEmptyIllustration className="pointer-events-none absolute bottom-10 right-10 h-24 w-44 opacity-20" />
          <div className="relative mb-6">
            <div className="relative flex h-20 w-20 items-center justify-center border border-[#dfe2ea] bg-[#f6f6f2] text-[#1687F8]">
              <FolderOpen size={30} strokeWidth={1.6} />
            </div>
          </div>
          <div className="eyebrow">Todavía no hay proyectos</div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-.04em] text-[#101A46]">
            Tu trabajo más limpio está por llegar.
          </h2>
          <p className="mt-3 max-w-[400px] text-sm leading-relaxed text-[#7a8299]">
            Empieza con una imagen raster o quita un fondo. Tus exportaciones y
            ajustes aparecerán aquí cuando el historial esté conectado.
          </p>
          <Link
            href="/workspace"
            className="mt-7 inline-flex items-center gap-2 border border-[#cbd3df] bg-white px-4 py-3 text-sm font-bold text-[#101A46] hover:border-[#1687F8]"
          >
            Abrir vectorizador <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-[#9aa1b2]">
          <Clock3 size={13} /> La persistencia del historial queda preparada
          para una futura conexión backend.
        </div>
      </div>
    </TraceFlowShell>
  );
}
