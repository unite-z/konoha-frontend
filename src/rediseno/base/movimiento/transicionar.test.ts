// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { transicionar } from "./transicionar";

function simularMatchMedia(reducir: boolean) {
  vi.stubGlobal("matchMedia", (consulta: string) => ({
    matches: reducir && consulta.includes("reduce"),
  }));
}

describe("transicionar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("llama directamente al cambio si el navegador no tiene startViewTransition", () => {
    simularMatchMedia(false);
    const cambio = vi.fn();
    transicionar(cambio);
    expect(cambio).toHaveBeenCalledTimes(1);
  });

  it("envuelve el cambio en startViewTransition si existe", () => {
    simularMatchMedia(false);
    const iniciar = vi.fn((fn: () => void) => fn());
    Object.defineProperty(document, "startViewTransition", {
      value: iniciar,
      configurable: true,
    });
    const cambio = vi.fn();
    transicionar(cambio);
    expect(iniciar).toHaveBeenCalledTimes(1);
    expect(cambio).toHaveBeenCalledTimes(1);
  });

  it("con prefers-reduced-motion no usa la transición y aplica el cambio", () => {
    simularMatchMedia(true);
    const iniciar = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      value: iniciar,
      configurable: true,
    });
    const cambio = vi.fn();
    transicionar(cambio);
    expect(iniciar).not.toHaveBeenCalled();
    expect(cambio).toHaveBeenCalledTimes(1);
  });
});
