import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RangeSlider from "./RangeSlider";

describe("RangeSlider", () => {
  it("el input nativo refleja min/max/value", () => {
    render(<RangeSlider min={0} max={200} value={50} onChange={() => {}} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.min).toBe("0");
    expect(input.max).toBe("200");
    expect(input.value).toBe("50");
  });

  it("dispara onChange con el numero correcto al cambiar", () => {
    const onChange = vi.fn();
    render(<RangeSlider min={0} max={200} value={50} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "120" } });
    expect(onChange).toHaveBeenCalledWith(120);
  });

  it("disabled bloquea la interacción", () => {
    render(<RangeSlider min={0} max={200} value={50} onChange={() => {}} disabled />);
    expect(screen.getByRole("slider")).toBeDisabled();
  });

  it("el ancho del relleno refleja el porcentaje del valor", () => {
    const { container } = render(<RangeSlider min={0} max={200} value={100} onChange={() => {}} />);
    const fill = container.querySelectorAll("span")[1] as HTMLElement;
    expect(fill.style.width).toBe("50%");
  });
});
