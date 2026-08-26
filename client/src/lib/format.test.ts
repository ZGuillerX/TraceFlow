import { describe, expect, it } from "vitest";
import { formatBytes } from "./format";

describe("formatBytes", () => {
  it("muestra bytes por debajo de 1024", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("muestra KB entre 1024 y 1MB", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("muestra MB a partir de 1024*1024", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("el borde exacto de 1024 cuenta como KB, no B", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("el borde exacto de 1024*1024 cuenta como MB, no KB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });
});
