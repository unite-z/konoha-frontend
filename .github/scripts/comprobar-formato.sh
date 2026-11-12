#!/usr/bin/env bash
# Formato (oxfmt, .oxfmtrc.json) solo sobre los ficheros que añade o modifica el PR (AV-245): como el
# ratchet de Spotless en el backend, no obliga a reformatear todo main de golpe.
# Uso: comprobar-formato.sh <sha-base>   (en local: origin/main; arreglar con: npx oxfmt <ficheros>)
set -euo pipefail

base="${1:?Falta el SHA base}"
ficheros=()
while IFS= read -r f; do ficheros+=("$f"); done < <(git diff --name-only --diff-filter=AM "$base"...HEAD -- 'src/*.ts' 'src/*.tsx' 'src/*.css' 'src/*.json')

if [[ ${#ficheros[@]} -eq 0 ]]; then
  echo "Ningún fichero de src/ que formatear."
  exit 0
fi

echo "Comprobando el formato de ${#ficheros[@]} fichero(s)."
if ! npx --no-install oxfmt --check "${ficheros[@]}"; then
  echo "::error::Hay ficheros mal formateados. Ejecuta: npx oxfmt <fichero>"
  exit 1
fi
