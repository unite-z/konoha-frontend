# `styles/`

Tokens y estilos globales. Aspecto y equivalencia con Figma: [`DESIGN.md`](../../DESIGN.md).

| Fichero | Qué hay |
|---|---|
| `tokens.css` | variables CSS: color, espacio, radio, tipografía, sombras y medidas de layout |
| `global.css` | reset, foco visible, movimiento reducido, `.sr-only`, `.cifra` y clases `.t-*` de tipografía |

**Reglas:**
- En componentes y páginas, solo tokens semánticos: `--color-*`, `--space-*`, `--radius-*` y `--type-*`.
- Nada de primitivos (`--green-700`, `--neutral-300`) fuera de `tokens.css`: no cambian con el tema.
- Un token nuevo solo si existe en Figma (colecciones «AV · Color» y «AV · Dimensiones») y con el mismo nombre de código que allí.
- Nada de estilos de componente en `global.css`: van en el `.module.css` del componente.

**No va aquí:** colores ni medidas de un solo componente (variable local en su `.module.css`, como `--boton-height`).

**Nombres:** variables en kebab-case con prefijo de familia (`--color-text-muted`, `--space-4`, `--radius-md`).

**Ejemplo:** `--color-action-primary` es «acento/default» en Figma. Cambiar su valor aquí cambia el fondo de todos los botones primarios. Por eso no se escribe `--green-700` en un `.module.css`: ese color no cambiaría.

**Estado:** valores de Figma y fuente Geist desde AV-331. Los primitivos `--green-*` y `--neutral-*` siguen definidos hasta que AV-332 quite sus últimos usos en páginas.

**Destino:** `design-system/`.
