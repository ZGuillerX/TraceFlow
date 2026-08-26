import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorInput from "./ColorInput";

describe("ColorInput", () => {
  it("escribir un hex válido y perder foco llama a onChange en mayúsculas con #", () => {
    const onChange = vi.fn();
    render(<ColorInput value="#1652F5" onChange={onChange} label="Trazo" />);
    const textInput = screen.getByLabelText("Escribir codigo hex para Trazo");
    fireEvent.change(textInput, { target: { value: "00ff00" } });
    fireEvent.blur(textInput);
    expect(onChange).toHaveBeenCalledWith("#00FF00");
  });

  it("un valor inválido al perder foco revierte al valor original sin llamar a onChange", () => {
    const onChange = vi.fn();
    render(<ColorInput value="#1652F5" onChange={onChange} label="Trazo" />);
    const textInput = screen.getByLabelText(
      "Escribir codigo hex para Trazo"
    ) as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: "no es un hex" } });
    fireEvent.blur(textInput);
    expect(onChange).not.toHaveBeenCalled();
    expect(textInput.value).toBe("#1652F5");
  });

  it("Enter dispara el commit del valor escrito", () => {
    const onChange = vi.fn();
    render(<ColorInput value="#1652F5" onChange={onChange} label="Trazo" />);
    const textInput = screen.getByLabelText("Escribir codigo hex para Trazo");
    textInput.focus();
    fireEvent.change(textInput, { target: { value: "abcdef" } });
    fireEvent.keyDown(textInput, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("#ABCDEF");
  });
});
