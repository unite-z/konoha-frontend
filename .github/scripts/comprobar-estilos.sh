#!/usr/bin/env bash
# Reglas de docs/estandares/estilo-codigo-ts-react.md y del sistema de diseño (DESIGN.md) que oxlint no cubre:
#   1. en todo src/: colores escritos a mano fuera de tokens.css y fetch fuera de services/api/;
#   2. en todo src/ salvo tokens.css y planificacion (AV-351): medidas en px (salvo 1-2 px, @media y consultas de
#      matchMedia) y font-size o border-radius que no usen var(--type-*) y var(--radius-*);
#   3. solo en las líneas añadidas del PR: medidas en px (también en planificacion) y style={...} (salvo valores
#      calculados marcados con el comentario estilo-calculado);
#   4. en todo src/: imports con más de un ../ (usa el alias @/, AV-333);
#   5. en las carpetas ya migradas al sistema de diseño (AV-351): nada de primitivos de color (--green-*,
#      --neutral-*...), ni <button>, <input>, <select>, <textarea>, <dialog> o <table> fuera de components/ui y
#      layouts salvo con el comentario «Excepción al sistema (AV-351): motivo», ni var(--x) sin definir.
# planificacion (MOD-03) queda fuera de 2 y 5 hasta que la sustituya el rediseño (AV-265 y siguientes).
# Uso: comprobar-estilos.sh <sha-base>
set -euo pipefail

base="${1:?Falta el SHA base}"
errores=0
falla() { echo "::error file=$1,line=$2::$3"; errores=1; }
sin_comentarios() { grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)' || true; }

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "Color escrito a mano: usa un token de src/styles/tokens.css."
done < <(git grep -nE '#[0-9a-fA-F]{3,8}([^0-9a-zA-Z_-]|$)|(^|[^a-zA-Z_-])(rgba?|hsla?)\(' -- 'src/*.css' 'src/*.tsx' \
  ':!src/styles/tokens.css' ':!*.test.tsx' | sin_comentarios)

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "Llamada a fetch fuera de src/services/api/: usa el cliente del módulo."
done < <(git grep -nE '(^|[^a-zA-Z0-9_])fetch\(' -- 'src/*.ts' 'src/*.tsx' ':!src/services' ':!*.test.ts' ':!*.test.tsx' \
  | sin_comentarios)

# --- Medidas y tipografía con tokens en todo src/ (AV-351) ------------------------------------------------
excluidas=(':!src/styles/tokens.css' ':!src/pages/planificacion' ':!*.test.ts' ':!*.test.tsx')

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "Medida en px: usa un token (--space-*, --radius-*...) o rem. Se admiten 1-2 px en bordes y px en @media."
done < <(git grep -nE '(^|[^0-9.a-zA-Z-])([3-9]|[1-9][0-9]+)(\.[0-9]+)?px' -- 'src/*.css' 'src/*.ts' 'src/*.tsx' "${excluidas[@]}" \
  | sin_comentarios | grep -vE '@media|\((max|min)-(width|height):[[:space:]]*[0-9]+px\)' || true)

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "font-size sin token: usa var(--type-*-size) (DESIGN.md, 3.4)."
done < <(git grep -nE 'font-size:' -- 'src/*.css' "${excluidas[@]}" | sin_comentarios \
  | grep -vE 'font-size:[[:space:]]*(var\(--type-[a-z0-9-]+\)|inherit|100%)[[:space:]]*(;|$)' || true)

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "border-radius sin token: usa var(--radius-*) (DESIGN.md, 3.3)."
done < <(git grep -nE 'border-radius:' -- 'src/*.css' "${excluidas[@]}" | sin_comentarios \
  | grep -vE 'border-radius:[[:space:]]*((var\(--radius-[a-z0-9-]+\)|0|50%|inherit)[[:space:]]*)+(;|$)' || true)

# --- Imports con el alias @/ (AV-333) ----------------------------------------------------------------------
while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "Import con más de un ../: usa el alias @/ (docs/estandares/estilo-codigo-ts-react.md)."
done < <(git grep -nE "(from|import|import\(|vi\.mock\(|importActual[^(]*\()[[:space:]]*['\"](\.\./){2,}" -- 'src/*.ts' 'src/*.tsx' \
  | sin_comentarios)

# --- Sistema de diseño en las carpetas migradas (AV-351) --------------------------------------------------
migradas=(src/components/ui src/components/core src/components/reportes-indicadores src/components/tercerizados
  src/layouts src/pages/servicios-tercerizados src/pages/reportes-indicadores src/pages/acceso
  src/pages/usuarios-roles src/pages/repositorio src/pages/operacion-campo src/pages/inventario)

while IFS=: read -r fichero linea _; do
  falla "$fichero" "$linea" "Primitivo de color: usa el token semántico de src/styles/tokens.css (DESIGN.md, 3.1)."
done < <(git grep -nE 'var\(--(green|neutral|blue|red|amber|slate|gray)-[0-9]' -- "${migradas[@]/%//*.css}" "${migradas[@]/%//*.tsx}" \
  | sin_comentarios)

while IFS=: read -r fichero linea _; do
  if ! grep -q 'Excepción al sistema (AV-351)' "$fichero"; then
    falla "$fichero" "$linea" "Control crudo fuera de components/ui: usa Boton, Casilla, GrupoOpciones, Selector, DialogoFormulario o TablaDatos. Si es un dato interactivo, documéntalo con «Excepción al sistema (AV-351): motivo»."
  fi
done < <(git grep -nE '<(button|input|select|textarea|dialog|table)([[:space:]>]|$)' -- "${migradas[@]/%//*.tsx}" \
  ':!src/components/ui' ':!src/layouts' ':!*.test.tsx' | sin_comentarios)

# Variables definidas en cualquier CSS o como propiedad calculada en TSX; usadas en las carpetas migradas.
definidas=$(git grep -hoE -- '--[a-zA-Z0-9-]+[[:space:]]*:' -- 'src/*.css' | sed -E 's/[[:space:]]*:$//'
  git grep -hoE -- "['\"]--[a-zA-Z0-9-]+['\"]" -- 'src/*.tsx' | tr -d "'\"")
while IFS=: read -r fichero linea uso; do
  nombre=${uso#var(}
  if ! grep -qxF -- "$nombre" <<< "$definidas"; then
    falla "$fichero" "$linea" "La variable $nombre no está definida: usa un token de src/styles/tokens.css."
  fi
done < <(git grep -noE 'var\(--[a-zA-Z0-9-]+' -- "${migradas[@]/%//*.css}" "${migradas[@]/%//*.tsx}")

# Líneas añadidas, con su número en el fichero nuevo (a partir de las cabeceras @@ del diff).
while IFS=$'\t' read -r fichero linea texto; do
  case "$fichero" in
    *.css)
      if [[ "$texto" != *@media* ]] && grep -qE '(^|[^0-9.])([3-9]|[1-9][0-9]+)(\.[0-9]+)?px' <<< "$texto"; then
        falla "$fichero" "$linea" "Medida en px escrita a mano: usa un token (--space-*, --radius-*...). Se admiten 1-2 px en bordes y px en @media."
      fi ;;
    *.tsx)
      if grep -qE 'style=\{' <<< "$texto" && [[ "$texto" != *estilo-calculado* ]]; then
        falla "$fichero" "$linea" "Estilo en línea: muévelo al .module.css del componente. Si es un valor calculado en tiempo de ejecución, márcalo con el comentario estilo-calculado."
      fi ;;
  esac
done < <(git diff -U0 --diff-filter=AM "$base"...HEAD -- 'src/*.css' 'src/*.tsx' ':!src/styles/tokens.css' \
  | awk '/^\+\+\+ b\// { f = substr($0, 7); next }
         /^@@/ { split($3, a, ","); n = substr(a[1], 2) + 0; next }
         /^\+/ { print f "\t" n "\t" substr($0, 2); n++ }')

if (( errores == 0 )); then echo "Estilos correctos."; fi
exit "$errores"
