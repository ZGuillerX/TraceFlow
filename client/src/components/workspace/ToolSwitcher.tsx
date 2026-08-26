import type { StudioTool } from "./PreviewCanvas";

interface ToolSwitcherProps {
  tool: StudioTool;
  setTool: (t: StudioTool) => void;
}

/** Selector de herramienta activa del Studio: alterna entre vectorizar
 * y quitar fondo dentro del mismo flujo. */
export default function ToolSwitcher({ tool, setTool }: ToolSwitcherProps) {
  return (
    <>
      <div className="font-technical mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#9AA1B2]">
        Herramienta
      </div>
      <div className="flex border border-[#DEDDD3] bg-white p-1">
        <button
          onClick={() => setTool("vectorize")}
          className={`flex-1 px-3 py-2 text-xs font-bold ${tool === "vectorize" ? "bg-[#0C1330] text-white" : "text-[#7A8194]"}`}
        >
          Vectorizar
        </button>
        <button
          onClick={() => setTool("remove-bg")}
          className={`flex-1 px-3 py-2 text-xs font-bold ${tool === "remove-bg" ? "bg-[#0C1330] text-white" : "text-[#7A8194]"}`}
        >
          Quitar fondo
        </button>
      </div>
    </>
  );
}
