import { Link, type LinkProps } from "react-router";

/** `Link` que anima el cambio de vista con View Transitions. */
export function EnlaceTransicion(props: Omit<LinkProps, "viewTransition">) {
  return <Link {...props} viewTransition />;
}
