/** `true` si la ruta es `base` o cuelga de ella; ignora la consulta y el hash de `base`. */
export function enRuta(pathname: string, base: string): boolean {
  const ruta = base.split(/[?#]/)[0]
  return pathname === ruta || pathname.startsWith(`${ruta}/`)
}

/** La más específica entre varias rutas que casan con `pathname` (índice) o -1: así «Sectores» no oculta «Sectores/Zona». */
export function indiceMasEspecifico(pathname: string, rutas: readonly string[]): number {
  let mejor = -1
  let largo = -1
  rutas.forEach((ruta, i) => {
    const limpia = ruta.split(/[?#]/)[0]
    if (enRuta(pathname, ruta) && limpia.length > largo) {
      mejor = i
      largo = limpia.length
    }
  })
  return mejor
}
