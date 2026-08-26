import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useImageDimensions } from "./useImageDimensions";

class FakeImage {
  onload: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = "";

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      this.naturalWidth = 220;
      this.naturalHeight = 150;
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }
}

describe("useImageDimensions", () => {
  const OriginalImage = global.Image;

  beforeEach(() => {
    // @ts-expect-error -- reemplazo deliberado por un stub controlable en el test
    global.Image = FakeImage;
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it("devuelve null cuando src es null", () => {
    const { result } = renderHook(() => useImageDimensions(null));
    expect(result.current).toBeNull();
  });

  it("devuelve las dimensiones naturales tras el onload", async () => {
    const { result } = renderHook(() => useImageDimensions("blob:fake"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toEqual({ w: 220, h: 150 });
  });

  it("vuelve a null si src pasa de un valor a null", () => {
    const { result, rerender } = renderHook(({ src }) => useImageDimensions(src), {
      initialProps: { src: "blob:fake" as string | null },
    });
    rerender({ src: null });
    expect(result.current).toBeNull();
  });
});
