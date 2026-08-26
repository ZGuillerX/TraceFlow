import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5] p-8 text-[#0C1330]">
          <div className="flex w-full max-w-2xl flex-col items-center border border-[#DEDDD3] bg-white p-8 shadow-[0_18px_50px_rgba(12,19,48,.06)]">
            <AlertTriangle
              size={48}
              className="mb-6 shrink-0 text-[#1652F5]"
            />

            <h2 className="font-display text-xl text-[#0C1330]">
              Ocurrió un error inesperado.
            </h2>

            <div className="mb-6 mt-6 w-full overflow-auto border border-[#DEDDD3] bg-[#F4F3ED] p-4">
              <pre className="whitespace-break-spaces text-sm text-[#7A8194]">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="button-press flex items-center gap-2 bg-[#0C1330] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#18234f]"
            >
              <RotateCcw size={16} />
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
