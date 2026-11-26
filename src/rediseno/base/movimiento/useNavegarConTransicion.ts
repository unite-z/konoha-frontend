import { useCallback } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router";

/** `navigate` que anima el cambio de vista con View Transitions. */
export function useNavegarConTransicion(): (
  a: To,
  opciones?: NavigateOptions,
) => void {
  const navegar = useNavigate();
  return useCallback(
    (a: To, opciones?: NavigateOptions) => {
      void navegar(a, { ...opciones, viewTransition: true });
    },
    [navegar],
  );
}
