/* TraceFlow / Vector Atelier: eliminación de fondos con checkerboard, anotaciones antes/después y acción azul eléctrica. */
import { useRef, useState } from 'react';
import { ArrowDownToLine, Eraser, ImagePlus, Maximize2, RotateCcw, Sparkles, Upload } from 'lucide-react';
import TraceFlowShell from '@/components/TraceFlowShell';
import { toast } from 'sonner';
import sample from '@/assets/sample-transform.webp';

export default function BackgroundRemover() {
  const input = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [originalUrl, setOriginalUrl] = useState<string | null>(null); const [resultUrl, setResultUrl] = useState<string | null>(null); const [intensity, setIntensity] = useState(82); const [showOriginal, setShowOriginal] = useState(false); const [processing, setProcessing] = useState(false);
  const choose = () => input.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setFile(f); setOriginalUrl(URL.createObjectURL(f)); setResultUrl(null); setShowOriginal(false); toast.success('Imagen lista para quitar el fondo.'); } };
  const reset = () => { setFile(null); setOriginalUrl(null); setResultUrl(null); };
  const process = async () => {
    if (!file) return toast.info('Carga una imagen primero.');
    setProcessing(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/remove-background', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      setShowOriginal(false);
      toast.success('Fondo eliminado. Descarga lista.');
    } catch {
      toast.error('No se pudo quitar el fondo. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };
  const download = () => {
    if (!resultUrl) return toast.info('Procesa una imagen para descargar.');
    const a = document.createElement('a');
    a.href = resultUrl; a.download = (file?.name.replace(/\.[^.]+$/, '') || 'traceflow') + '-sin-fondo.png'; a.click();
    toast.success('PNG transparente descargado.');
  };
  const imgSrc = showOriginal ? (originalUrl || sample) : (resultUrl || sample);
  const isDemo = showOriginal ? !originalUrl : !resultUrl;
  return <TraceFlowShell workspace><div className="px-5 py-8 lg:px-10 lg:py-10"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="eyebrow">02 / Quitar fondo</div><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Quitar fondo</h1><p className="mt-2 max-w-[560px] text-sm text-[#69728a]">Limpia el fondo. Conserva lo importante. Exporta un recorte listo para usar.</p></div><div className="flex items-center gap-2 text-xs text-[#7a8299]"><Sparkles size={14} className="text-[#7C3AED]" /> Inteligencia de bordes</div></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="border border-[#cfd5e1] bg-white p-4 shadow-[0_18px_50px_rgba(16,26,70,.06)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-bold text-[#101A46]"><Eraser size={15} className="text-[#1687F8]" /> Antes / después</div><button onClick={() => setShowOriginal(v => !v)} className="border border-[#dfe2ea] px-3 py-2 text-xs font-bold text-[#101A46] hover:border-[#1687F8]">{showOriginal ? 'Ver resultado' : 'Ver original'}</button></div><div className="relative flex min-h-[490px] items-center justify-center overflow-hidden border border-[#dfe2ea] bg-[#f6f6f2] p-5"><div className={`relative h-[330px] w-full max-w-[560px] overflow-hidden border border-[#d6dbe5] ${showOriginal ? 'bg-[#e6e8ec]' : 'checkerboard'}`}><img src={imgSrc} alt="Vista previa de la eliminación de fondo" className={`h-full w-full object-contain ${isDemo ? 'mix-blend-multiply opacity-90' : ''}`} /><div className="absolute left-4 top-4 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#101A46] shadow-sm">{showOriginal ? 'Original' : 'Resultado transparente'}</div><button onClick={() => toast.info('Vista ampliada disponible al exportar.')} className="absolute bottom-4 right-4 rounded-lg bg-white/90 p-2 text-[#101A46] shadow-sm hover:bg-white" aria-label="Ampliar preview"><Maximize2 size={15} /></button></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-[#7a8299]">{file ? <span className="font-semibold text-[#101A46]">{file.name}</span> : 'Carga una imagen para ver el resultado'}</div><div className="flex gap-2"><button onClick={reset} className="rounded-lg p-2 text-[#7a8299] hover:bg-[#f0f1f4]" aria-label="Restablecer"><RotateCcw size={15} /></button><button onClick={choose} className="flex items-center gap-2 border border-[#dfe2ea] px-3 py-2 text-xs font-bold text-[#101A46] hover:border-[#1687F8]"><Upload size={14} /> {file ? 'Reemplazar' : 'Elegir archivo'}</button></div></div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} className="hidden" /></section><aside className="border border-[#cfd5e1] bg-[#f6f6f2] p-5"><div className="mb-6"><div className="eyebrow">Refinar bordes</div><h2 className="mt-1 font-display text-lg font-semibold">Ajustes de recorte</h2></div><label className="text-xs font-bold text-[#101A46]">Sensibilidad de borde <span className="float-right text-[#1687F8]">{intensity}%</span></label><input type="range" min="30" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))} className="mt-3 w-full accent-[#1687F8]" /><p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">Ajusta cuánto detalle fino se conserva en el recorte.</p><div className="my-6 hairline" /><div className="border border-[#dfe2ea] bg-white p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#101A46]"><ImagePlus size={15} className="text-[#1687F8]" /> Tipos de entrada</div><p className="mt-2 text-[11px] leading-relaxed text-[#7a8299]">PNG, JPG, WEBP o SVG hasta 25 MB.</p></div><button onClick={process} className="button-press mt-8 flex w-full items-center justify-center gap-2 bg-[#1687F8] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#0e74dd]">{processing ? <RotateCcw size={16} className="animate-spin" /> : <Eraser size={16} />} {processing ? 'Quitando fondo…' : 'Quitar fondo'}</button><button onClick={download} className="button-press mt-2 flex w-full items-center justify-center gap-2 border border-[#cbd3df] bg-white px-4 py-3 text-sm font-bold text-[#101A46] hover:border-[#1687F8]"><ArrowDownToLine size={16} /> Descargar PNG</button></aside></div></div></TraceFlowShell>;
}
