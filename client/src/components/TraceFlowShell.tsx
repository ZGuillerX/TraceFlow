/* TraceFlow / Vector Atelier: layout persistente, navegación contextual y jerarquía editorial. */
import { Link, useLocation } from 'wouter';
import { ArrowUpRight, Clock3, Eraser, Home, Menu, Moon, Settings2, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import mark from '@/assets/mark.svg';
import fullLogo from '@/assets/logo-full.svg';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="group inline-flex items-center gap-3" aria-label="TraceFlow, inicio">
    <img src={mark} alt="" className={compact ? 'h-9 w-9 object-contain' : 'h-10 w-10 object-contain'} />
    {!compact && <span className="font-display text-[1.25rem] font-bold tracking-[-0.05em] text-[#101A46]">Trace<span className="text-[#1687F8]">Flow</span></span>}
  </Link>;
}

const nav = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/workspace', label: 'Vectorizar', icon: WandSparkles },
  { href: '/background-remover', label: 'Quitar fondo', icon: Eraser },
  { href: '/history', label: 'Historial', icon: Clock3 },
];

export default function TraceFlowShell({ children, workspace = false }: { children: React.ReactNode; workspace?: boolean }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = <aside className="flex h-full flex-col border-r border-[#dfe2ea] bg-[#f6f6f2] px-5 py-6">
    <Brand />
    <div className="mt-12 mb-4 px-2 eyebrow">Estudio</div>
    <nav className="space-y-1" aria-label="Navegación principal">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = location === href;
        return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${active ? 'bg-[#101A46] text-white shadow-[0_8px_20px_rgba(16,26,70,.12)]' : 'text-[#58627d] hover:bg-white hover:text-[#101A46]'}`}>
          <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />{label}
          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#22C7E8]" />}
        </Link>;
      })}
    </nav>
    <div className="mt-auto rounded-2xl border border-[#dfe2ea] bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><span className="eyebrow">Prueba Pro</span><Sparkles size={15} className="text-[#7C3AED]" /></div>
      <p className="mb-3 text-xs leading-relaxed text-[#69728a]">Procesa tus primeras imágenes con resultados de alta fidelidad.</p>
      <button onClick={() => toast.info('Los planes estarán disponibles próximamente.')} className="flex items-center gap-1 text-xs font-bold text-[#101A46]">Ver planes <ArrowUpRight size={13} /></button>
    </div>
  </aside>;

  if (workspace) return <div className="min-h-screen bg-[#fbfbf8] text-[#101A46]">
    <div className="flex min-h-screen">
      <div className={`fixed inset-y-0 left-0 z-40 w-[260px] transition-transform lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-[#101A46]/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}
      <main className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e5e6eb] bg-[#fbfbf8]/90 px-5 backdrop-blur lg:px-10">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#58627d] hover:bg-[#f0f1f4] lg:hidden" aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs text-[#7a8299] lg:flex"><span className="h-2 w-2 rounded-full bg-[#22C7E8]" /> Motor listo <span className="text-[#d2d6de]">/</span> Espacio local</div>
          <div className="ml-auto flex items-center gap-3"><button onClick={() => toast.info('Ajustes disponibles próximamente.')} className="rounded-lg p-2 text-[#7a8299] hover:bg-[#f0f1f4]" aria-label="Ajustes"><Settings2 size={18} /></button><button onClick={() => toast.info('El tema oscuro estará disponible próximamente.')} className="rounded-lg p-2 text-[#7a8299] hover:bg-[#f0f1f4]" aria-label="Cambiar tema"><Moon size={18} /></button><div className="h-8 w-8 rounded-full bg-[#101A46] text-center text-xs font-bold leading-8 text-white">TF</div></div>
        </header>
        {children}
      </main>
    </div>
  </div>;

  return <div className="min-h-screen bg-[#fbfbf8] text-[#101A46]">
    <header className="container flex h-[88px] items-center justify-between"><Brand /><nav className="hidden items-center gap-8 text-sm font-semibold text-[#626c86] md:flex"><a href="#how-it-works" className="transition-colors hover:text-[#101A46]">Cómo funciona</a><a href="#features" className="transition-colors hover:text-[#101A46]">Capacidades</a><Link href="/history" className="transition-colors hover:text-[#101A46]">Historial</Link></nav><div className="flex items-center gap-3"><button onClick={() => toast.info('Iniciar sesión estará disponible próximamente.')} className="hidden text-sm font-bold text-[#101A46] sm:block">Iniciar sesión</button><Link href="/workspace" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#101A46] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(16,26,70,.14)] hover:bg-[#18265e]">Abrir estudio <ArrowUpRight size={15} /></Link></div></header>
    {children}
    <footer className="container flex flex-col gap-3 border-t border-[#dfe2ea] py-8 text-xs text-[#7a8299] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Brand compact /><span>© 2026 TraceFlow</span></div><span>Raster in. Vector out.</span></footer>
  </div>;
}

export { fullLogo };
