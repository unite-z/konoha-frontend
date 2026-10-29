#!/usr/bin/env bash
# Reglas de docs/estandares/estilo-codigo-ts-react.md que oxlint no cubre:
#   1. en todo src/: colores escritos a mano fuera de tokens.css y fetch fuera de services/api/;
#   2. solo en las líneas añadidas del PR: medidas en px (salvo 0-2 px y @media) y style={...}
#      (salvo valores calculados marcados con el comentario estilo-calculado).
# Lo segundo solo mira lo nuevo porque main aún tiene medidas antiguas: se corrigen al tocarlas.
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
