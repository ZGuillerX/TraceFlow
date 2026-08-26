import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDropzone } from "./useDropzone";

function TestDropzone({
  onDrop,
  disabled,
}: {
  onDrop: (f: File | undefined) => void;
  disabled?: boolean;
}) {
  const dz = useDropzone({ onDrop, disabled });
  return (
    <div
      data-testid="dropzone"
      onDragOver={dz.onDragOver}
      onDragLeave={dz.onDragLeave}
      onDrop={dz.onDrop}
    >
      {dz.isDragging ? "dragging" : "idle"}
    </div>
  );
}

describe("useDropzone", () => {
  it("activa isDragging en dragover y lo desactiva en dragleave", () => {
    render(<TestDropzone onDrop={vi.fn()} />);
    const el = screen.getByTestId("dropzone");
    expect(el).toHaveTextContent("idle");
    fireEvent.dragOver(el);
    expect(el).toHaveTextContent("dragging");
    fireEvent.dragLeave(el);
    expect(el).toHaveTextContent("idle");
  });

  it("llama a onDrop con el archivo soltado y apaga isDragging", () => {
    const onDrop = vi.fn();
    render(<TestDropzone onDrop={onDrop} />);
    const el = screen.getByTestId("dropzone");
    const file = new File(["contenido"], "test.png", { type: "image/png" });
    fireEvent.dragOver(el);
    fireEvent.drop(el, { dataTransfer: { files: [file] } });
    expect(onDrop).toHaveBeenCalledWith(file);
    expect(el).toHaveTextContent("idle");
  });

  it("disabled=true bloquea dragover y drop", () => {
    const onDrop = vi.fn();
    render(<TestDropzone onDrop={onDrop} disabled />);
    const el = screen.getByTestId("dropzone");
    fireEvent.dragOver(el);
    expect(el).toHaveTextContent("idle");
    const file = new File(["contenido"], "test.png", { type: "image/png" });
    fireEvent.drop(el, { dataTransfer: { files: [file] } });
    expect(onDrop).not.toHaveBeenCalled();
  });
});
