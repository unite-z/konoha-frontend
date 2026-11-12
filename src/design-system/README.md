# `design-system/`

Componentes base del sistema de diseño: el equivalente en código de la página «Sistema de diseño · Áreas Verdes» de Figma. Cambiar uno cambia todas las pantallas. Qué componente usar y con qué variante: [`DESIGN.md`](../../DESIGN.md).

**Va aquí:** controles y piezas visuales sin lógica de negocio: `Boton`, `Estado`, `CampoFormulario`, `Selector`, `TablaDatos`, `DialogoConfirmacion`, `Tarjeta`, `Casilla`, `GrupoOpciones`, `EstadoCarga`, `EstadoSinAcceso`, `EventoCalendario`, `FilaChecklist` (jardín de la ruta del capataz)…

**Campos numéricos:** `CampoFormulario` con `formato="entero"` o `"decimal"` filtra lo que se escribe o se pega (`filtrarNumero` en `campoFormularioUtil.ts`). Úsalo en lugar de `inputMode` o `type="number"`.

**Anchos de `DialogoFormulario`:** `estrecho` (un solo campo, como «Registrar motivo» o «Iniciar CC-2026-11»; sin línea sobre los botones), `medio` (con `conCierre`, como «Registrar interrupción»), `normal`, `amplio` y `lateral` (panel a la derecha; en móvil, a pantalla completa con la X a la izquierda del título, el cuerpo sobre el fondo de la aplicación y solo el botón primario, como «Programar ciclo» 352-2324) y `hoja` (hoja inferior del móvil: desde abajo, con asa y los dos botones en una fila, como «ya está marcado» 375-6817; en escritorio, como `estrecho`). Con `accionesApiladas`, los botones van a todo el ancho y el principal arriba, y `onCancelar` da acción propia al secundario («Reportar igualmente», 391-8469).

**Pestañas en caja y tabla sin marco:** `Pestanas` con `enCaja`, `derecha` y `ancho="completo"` (pasos), y `TablaDatos` con `sinMarco` dentro de ella (detalle del corte). Una columna con `tituloOculto` deja su título solo para lectores de pantalla (acciones).

**Formularios de ficha:** `GrupoOpciones` con `segmentado` (control segmentado de radios, «Severidad» de «Clasificar»), `ListaDescripcion` con `columnas="filas"` (una fila por par, etiqueta a la izquierda y una línea entre filas, la ficha de una incidencia) y `Boton` con `variante="enlace"` (acción secundaria dentro de una tarjeta).

**Adjuntar en un formulario:** `ZonaCarga` con `compacta` (fila punteada con un solo botón, «Adjuntar foto») `ZonaCarga` con `miniatura` (hueco del tamaño de una foto, «Otra»), `GrupoOpciones` con `horizontal` y `repartido` (dos opciones a medias, «Reportado por») y `GrupoOpciones` con `chips` (píldoras que bajan de línea, «Tipo» del reporte móvil).

**Detalle lateral:** `DialogoDetalle` con `lateral` para un panel de solo lectura a la derecha (historial de cambios).

**Movimiento de los diálogos:** `AnimacionDialogo.module.css` (entrada y salida, centrada, lateral o, en móvil, la hoja desde abajo) y `useCierreAnimado.ts` (espera a que termine la salida antes de avisar con `onCerrar`) los comparten `DialogoFormulario`, `DialogoConfirmacion` y `DialogoDetalle`. Un diálogo nuevo los usa igual.

**Nombres antiguos** (no los uses en código nuevo; se retiran al migrar cada módulo): `Badge` → `Estado`; `variante="terciario"` → `fantasma`. Para pasar a `Estado` una insignia de `utils/` con tono antiguo: `<Estado {...insigniaAEstado(insigniaEstado(x))} />` (`tonos.ts`).

**No va aquí:**
- Nada que conozca un módulo, un endpoint o un permiso. Lo de negocio compartido va en `components/core/` y lo de un módulo, junto a sus páginas.
- Estilos de página ni excepciones de un solo uso. Si una pantalla necesita otra variante, se añade la variante aquí (y antes en Figma).

**Reglas:**
- Antes de crear un componente, busca aquí. Si no existe, se diseña primero en Figma.
- Solo tokens semánticos de `tokens.css`. Las páginas no cambian color, radio ni padding de un componente con `className`.
- Cada componente lleva su prueba (Testing Library, a partir de la fase 1).

**Nombres:** el de Figma sin tildes y en PascalCase (`Botón` → `Boton.tsx` + `Boton.module.css`). Las variantes, como en Figma: `variante="primario"`. Utilidades del propio sistema en camelCase (`tonos.ts`).

**Ejemplo:** `Boton.tsx` define las variantes `primario`, `secundario`, `fantasma` y `destructivo`, más `icono`, `compacto`, `cargando` y `BotonEnlace` para navegar. En una página:

```tsx
<Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>
```

**Imports:** Código nuevo: `@/design-system/...`. Los imports antiguos `@/components/ui/...` y `@/styles/...` siguen funcionando por un alias (`vite.config.ts` y `tsconfig.app.json`) y se migran al tocar cada fichero; no los uses en código nuevo.

## Tokens y estilos globales

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

**Estado:** valores de Figma y fuente Geist desde AV-331. Los primitivos `--green-*` y `--neutral-*` de la Guía Web antigua ya no existen (AV-332): solo quedan tokens semánticos y los `--map-*` de los mapas.
