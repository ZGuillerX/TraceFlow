/* TraceFlow / Vector Atelier: landing fiel al mockup "Vectora Studio" -- tipografia Anton + JetBrains Mono, paleta crema/navy/azul/verde lima. */
import { ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";
import mark from "@/assets/mark.svg";
import hero from "@/assets/hero-illustration.webp";
import sample from "@/assets/sample-transform.webp";

const STEPS: [string, string, string][] = [
  ["01", "Carga tu fuente", "PNG, JPG o WEBP."],
  ["02", "Ajusta el trazado", "Ajusta detalle, suavizado y color."],
  [
    "03",
    "Exporta el resultado",
    "Descarga un asset limpio para tu próxima pantalla.",
  ],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0C1330]">
      <header className="flex items-center justify-between gap-8 border-b border-[#E3E2D9] px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img src={mark} alt="" className="h-10 w-10 object-contain" />
          <span className="font-display text-2xl text-[#0C1330]">
            TraceFlow
          </span>
        </Link>
        <nav className="hidden items-center gap-9 text-sm font-medium text-[#454C63] md:flex">
          <a href="#como-funciona" className="hover:text-[#0C1330]">
            Cómo funciona
          </a>
          <a href="#capacidades" className="hover:text-[#0C1330]">
            Capacidades
          </a>
        </nav>
        <Link
          href="/workspace"
          className="button-press inline-flex items-center gap-2 bg-[#0C1330] px-5 py-3.5 text-sm font-bold text-[#D8F646] hover:bg-[#18234f]"
        >
          Abrir estudio <ArrowRight size={15} />
        </Link>
      </header>

      <main>
        <section className="grid items-center gap-12 border-b border-[#E3E2D9] px-6 py-16 sm:px-10 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
          <div className="max-w-[560px]">
            <div className="eyebrow flex items-center gap-3">
              <span className="h-[3px] w-8 bg-[#B9D62F]" /> Procesamiento
              inteligente de imágenes
            </div>
            <h1 className="font-display mt-6 text-5xl leading-[.95] tracking-[-.01em] text-[#0C1330] sm:text-7xl">
              De píxeles sueltos a{" "}
              <span className="text-[#1652F5]">curvas</span> que puedes usar
              <span className="text-[#D8F646]">.</span>
            </h1>
            <p className="mt-7 max-w-[480px] text-[17px] leading-relaxed text-[#4B5266]">
              Convierte imágenes raster en SVGs limpios y elimina fondos con
              un flujo rápido, preciso y pensado para resultados
              profesionales.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/workspace"
                className="button-press inline-flex items-center justify-center gap-3 bg-[#1652F5] px-7 py-5 text-base font-bold text-white hover:bg-[#0B3ECB]"
              >
                Probar vectorizador <ArrowRight size={18} />
              </Link>
              <Link
                href="/background-remover"
                className="button-press inline-flex items-center justify-center border border-[#0C1330] px-8 py-5 text-base font-bold text-[#0C1330] hover:bg-[#0C1330] hover:text-[#D8F646]"
              >
                Quitar un fondo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#4B5266]">
              <span className="flex items-center gap-2.5">
                <Check size={14} className="text-[#8FB811]" /> Salida lista
                para SVG
              </span>
              <span className="h-4 w-px bg-[#D8D7CD]" />
              <span className="flex items-center gap-2.5">
                <Check size={14} className="text-[#8FB811]" /> PNG
                transparente
              </span>
              <span className="h-4 w-px bg-[#D8D7CD]" />
              <span className="flex items-center gap-2.5">
                <Check size={14} className="text-[#8FB811]" /> Sin
                conocimientos avanzados
              </span>
            </div>
          </div>

          <div className="border border-[#DEDDD3] bg-white p-2.5">
            <div className="relative">
              <img
                src={hero}
                alt="Píxeles transformándose en curvas Bézier"
                className="block h-[300px] w-full object-cover sm:h-[430px]"
              />
              <div className="eyebrow absolute left-5 top-4.5 flex items-center gap-3 text-[#1652F5]">
                Raster
                <ArrowRight size={16} className="text-[#0C1330]" />
                <span className="text-[#7F9313]">Vector</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2.5 py-4">
              <div className="flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center border border-[#DEDDD3]">
                  <img src={mark} alt="" className="h-6 w-6 object-contain" />
                </span>
                <span className="font-technical text-[13px] font-bold uppercase tracking-[.16em] text-[#0C1330]">
                  Motor vectorial
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 bg-[#1652F5]" />
                <span className="h-2.5 w-2.5 bg-[#0C1330]" />
                <span className="h-2.5 w-2.5 bg-[#1652F5]" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="capacidades"
          className="grid gap-14 border-b border-[#E3E2D9] bg-[#F4F3ED] px-6 py-16 sm:px-10 lg:grid-cols-[.85fr_1.15fr]"
        >
          <div>
            <div className="eyebrow flex items-center gap-3">
              <span className="h-[3px] w-8 bg-[#B9D62F]" /> Un estudio, dos
              flujos
            </div>
            <h2 className="font-display mt-6 max-w-[420px] text-4xl leading-tight text-[#0C1330] sm:text-5xl">
              La herramienta que entiende lo que quieres conservar
              <span className="text-[#B9D62F]">.</span>
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/workspace"
              className="block border border-[#DEDDD3] bg-[#FDFDFA] p-6 transition-colors hover:border-[#0C1330]"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-[52px] w-[52px] items-center justify-center bg-[#D8F646]">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M6 20C11 20 12.5 8 20 8"
                      stroke="#0C1330"
                      strokeWidth="2"
                    />
                    <rect x="3" y="17" width="6" height="6" fill="#0C1330" />
                    <rect x="17" y="5" width="5" height="5" fill="#0C1330" />
                  </svg>
                </span>
                <ArrowRight size={20} className="text-[#0C1330]" />
              </div>
              <h3 className="font-display mt-9 text-2xl text-[#0C1330]">
                Vectorizar raster
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#4B5266]">
                Convierte fotos, ilustraciones y capturas en SVGs editables
                con menos nodos y más fidelidad.
              </p>
            </Link>
            <Link
              href="/background-remover"
              className="block border border-[#DEDDD3] bg-[#FDFDFA] p-6 transition-colors hover:border-[#0C1330]"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-[52px] w-[52px] items-center justify-center bg-[#D8F646]">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect
                      x="6"
                      y="9"
                      width="15"
                      height="9"
                      transform="rotate(-30 6 9)"
                      stroke="#0C1330"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path d="M7 22h14" stroke="#0C1330" strokeWidth="2" />
                  </svg>
                </span>
                <ArrowRight size={20} className="text-[#0C1330]" />
              </div>
              <h3 className="font-display mt-9 text-2xl text-[#0C1330]">
                Quitar fondo
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#4B5266]">
                Aísla el sujeto principal con bordes limpios y exporta
                imágenes listas para componer.
              </p>
            </Link>
          </div>
        </section>

        <section
          id="como-funciona"
          className="grid items-center gap-14 border-b border-[#E3E2D9] px-6 py-16 sm:px-10 lg:grid-cols-[.85fr_1.15fr]"
        >
          <div>
            <div className="eyebrow flex items-center gap-3">
              <span className="h-[3px] w-8 bg-[#B9D62F]" /> Cómo funciona
            </div>
            <h2 className="font-display mt-6 max-w-[380px] text-4xl leading-tight text-[#0C1330] sm:text-5xl">
              Un proceso visible de principio a fin
              <span className="text-[#B9D62F]">.</span>
            </h2>
            <p className="mt-5 max-w-[420px] text-sm leading-relaxed text-[#4B5266]">
              Cada paso queda claro: carga, ajusta, revisa y exporta. Sin
              cajas negras ni controles escondidos.
            </p>
            <div className="mt-8 flex flex-col gap-5">
              {STEPS.map(([n, t, d]) => (
                <div className="flex gap-4" key={n}>
                  <span className="font-technical flex h-fit min-w-[36px] items-center justify-center bg-[#D8F646] px-2 py-1.5 text-sm font-bold text-[#0C1330]">
                    {n}
                  </span>
                  <div>
                    <div className="text-[15px] font-bold text-[#0C1330]">
                      {t}
                    </div>
                    <div className="mt-1.5 text-[13px] text-[#5A6076]">
                      {d}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative border border-[#DEDDD3] bg-white p-4">
            <img
              src={sample}
              alt="Antes y después: píxeles convertidos en curvas"
              className="block h-[300px] w-full object-contain sm:h-[430px]"
            />
            <div className="eyebrow absolute left-8 top-8 flex items-center gap-3 text-[#1652F5]">
              Antes
              <ArrowRight size={16} className="text-[#0C1330]" />
              <span className="text-[#7F9313]">Después</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-14 sm:px-10">
          <div className="relative overflow-hidden bg-[#0C1330] px-7 py-14 sm:px-14">
            <div className="pointer-events-none absolute -right-40 -top-28 h-[520px] w-[520px] rounded-full border-2 border-[#D8F646]/35" />
            <div className="pointer-events-none absolute -right-10 top-14 h-[420px] w-[420px] rounded-full border-[14px] border-[#1652F5]/55" />
            <div className="relative max-w-[600px]">
              <div className="eyebrow flex items-center gap-3 text-[#D8F646]">
                <span className="h-[3px] w-8 bg-[#D8F646]" /> Listo cuando tú
                quieras
              </div>
              <h2 className="font-display mt-6 text-4xl leading-tight text-white sm:text-5xl">
                Haz que tu próximo asset fluya
                <span className="text-[#D8F646]">.</span>
              </h2>
              <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/70">
                Empieza con una imagen. Sal con un resultado más limpio, más
                ligero y listo para producción.
              </p>
              <Link
                href="/workspace"
                className="button-press mt-8 inline-flex items-center gap-3 bg-[#D8F646] px-7 py-5 text-base font-bold text-[#0C1330] hover:bg-[#C6E52E]"
              >
                Abrir TraceFlow <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-[#E3E2D9] px-6 py-7 text-[13px] text-[#5A6076] sm:flex-row sm:px-10">
        <div className="flex items-center gap-3">
          <img src={mark} alt="" className="h-8 w-8 object-contain" />
          <span>© 2026 TraceFlow</span>
        </div>
        <span>Raster in. Vector out.</span>
      </footer>
    </div>
  );
}
