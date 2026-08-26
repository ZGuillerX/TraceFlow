import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/** Página 404: fuera de cualquier ruta conocida del sitio. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAF9F5] px-4 text-[#0C1330]">
      <div className="w-full max-w-lg border border-[#DEDDD3] bg-white p-10 text-center shadow-[0_18px_50px_rgba(12,19,48,.06)]">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center bg-[#F4F3ED]">
            <AlertCircle size={32} className="text-[#1652F5]" />
          </div>
        </div>
        <h1 className="font-display text-4xl text-[#0C1330]">404</h1>
        <h2 className="mt-2 font-display text-xl text-[#0C1330]">
          Página no encontrada
        </h2>
        <p className="mt-4 leading-relaxed text-[#7A8194]">
          La página que buscas no existe.
          <br />
          Puede que se haya movido o eliminado.
        </p>
        <Link
          href="/"
          className="button-press mt-8 inline-flex items-center gap-2 bg-[#0C1330] px-6 py-3 text-sm font-bold text-white hover:bg-[#18234f]"
        >
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
