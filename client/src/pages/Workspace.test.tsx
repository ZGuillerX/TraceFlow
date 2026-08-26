import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Workspace from "./Workspace";

const { vectorizeImageStream, vectorizeImage, removeBackgroundApi } = vi.hoisted(() => ({
  vectorizeImageStream: vi.fn(),
  vectorizeImage: vi.fn(),
  removeBackgroundApi: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  vectorizeImageStream,
  vectorizeImage,
  removeBackgroundApi,
}));

// smoke test de integracion: prueba que useVectorizeParams + useVectorizeFlow
// + useBackgroundRemovalTool siguen componiendo correctamente tras la
// extraccion de Workspace.tsx a hooks -- el punto de mayor riesgo de esa
// extraccion. No reemplaza la prueba manual en el navegador contra el
// backend real, es una red de seguridad para futuros cambios.
describe("Workspace", () => {
  beforeEach(() => {
    vectorizeImageStream.mockReset();
    vectorizeImage.mockReset();
    removeBackgroundApi.mockReset();
  });

  it("carga un archivo, lo vectoriza y refleja el resultado en el Inspector", async () => {
    vectorizeImageStream.mockImplementation(async (_file, _opts, onStage) => {
      onStage({ stage: "final" });
      return {
        svg: '<svg viewBox="0 0 10 10"><path fill="#1652F5" d="M0 0h10v10H0z"/></svg>',
        bgHex: null,
      };
    });

    render(<Workspace />);
    const user = userEvent.setup();

    const file = new File(["contenido"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText("test.png")).toBeInTheDocument();

    const downloadButton = screen.getByRole("button", { name: /descargar svg/i });
    expect(downloadButton).toBeDisabled();

    const generateButton = screen.getByRole("button", { name: /convertir a svg/i });
    await user.click(generateButton);

    await waitFor(() => expect(vectorizeImageStream).toHaveBeenCalledTimes(1));
    expect(vectorizeImageStream.mock.calls[0][0]).toBe(file);
    await waitFor(() => expect(downloadButton).not.toBeDisabled());
  });

  it("si vectorizar falla, no rompe la app y el botón vuelve a estar listo", async () => {
    vectorizeImageStream.mockRejectedValue(new Error("fallo simulado"));

    render(<Workspace />);
    const user = userEvent.setup();

    const file = new File(["contenido"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const generateButton = screen.getByRole("button", { name: /convertir a svg/i });
    await user.click(generateButton);

    await waitFor(() => expect(vectorizeImageStream).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /convertir a svg/i })).toBeInTheDocument()
    );
  });
});
