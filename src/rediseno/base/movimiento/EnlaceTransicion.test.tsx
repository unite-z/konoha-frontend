// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { EnlaceTransicion } from "./EnlaceTransicion";

describe("EnlaceTransicion", () => {
  it("pinta un enlace navegable", () => {
    const router = createMemoryRouter([
      {
        path: "/",
        element: <EnlaceTransicion to="/n/mapa">Mapa</EnlaceTransicion>,
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(
      screen.getByRole("link", { name: "Mapa" }).getAttribute("href"),
    ).toBe("/n/mapa");
  });
});
