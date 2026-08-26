import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "./errors";

describe("extractErrorMessage", () => {
  it("devuelve detail de un body JSON valido", async () => {
    const res = new Response(JSON.stringify({ detail: "Demasiadas peticiones." }));
    const message = await extractErrorMessage(res, "fallback");
    expect(message).toBe("Demasiadas peticiones.");
  });

  it("cae al fallback si el body no es JSON", async () => {
    const res = new Response("esto no es json");
    const message = await extractErrorMessage(res, "fallback");
    expect(message).toBe("fallback");
  });

  it("cae al fallback si detail no es un string", async () => {
    const res = new Response(JSON.stringify({ detail: 42 }));
    const message = await extractErrorMessage(res, "fallback");
    expect(message).toBe("fallback");
  });
});
