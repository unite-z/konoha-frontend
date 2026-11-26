import { describe, expect, it } from "vitest";
import {
  estiloTransicion,
  fila,
  nombresTransicion,
  panel,
} from "./nombresTransicion";

describe("nombresTransicion", () => {
  it("la fila y su panel comparten nombre para el morph", () => {
    expect(fila(7)).toBe(panel(7));
    expect(fila("a")).not.toBe(fila("b"));
  });

  it("los nombres fijos son distintos", () => {
    const valores = Object.values(nombresTransicion);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it("estiloTransicion devuelve viewTransitionName", () => {
    expect(estiloTransicion(fila(1))).toEqual({ viewTransitionName: "fila-1" });
  });
});
