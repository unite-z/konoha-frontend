# `components/ui/`

Componentes base del sistema de diseño: el equivalente en código de la página «Sistema de diseño · Áreas Verdes» de Figma. Cambiar uno cambia todas las pantallas. Qué componente usar y con qué variante: [`DESIGN.md`](../../../DESIGN.md).

**Va aquí:** controles y piezas visuales sin lógica de negocio: `Boton`, `Estado`, `CampoFormulario`, `Selector`, `TablaDatos`, `DialogoConfirmacion`, `EstadoCarga`, `EstadoSinAcceso`…

**Nombres antiguos** (no los uses en código nuevo; se retiran al migrar cada módulo): `Badge` → `Estado`; `variante="terciario"` → `fantasma`.

**No va aquí:**
- Nada que conozca un módulo, un endpoint o un permiso. Lo de negocio compartido va en `components/core/` y lo de un módulo, junto a sus páginas.
- Estilos de página ni excepciones de un solo uso. Si una pantalla necesita otra variante, se añade la variante aquí (y antes en Figma).

**Reglas:**
- Antes de crear un componente, busca aquí. Si no existe, se diseña primero en Figma.
- Solo tokens semánticos de `styles/tokens.css`. Las páginas no cambian color, radio ni padding de un componente con `className`.
- Cada componente lleva su prueba (Testing Library, a partir de la fase 1).

**Nombres:** el de Figma sin tildes y en PascalCase (`Botón` → `Boton.tsx` + `Boton.module.css`). Las variantes, como en Figma: `variante="primario"`. Utilidades del propio sistema en camelCase (`tonos.ts`).

**Ejemplo:** `Boton.tsx` define las variantes `primario`, `secundario`, `fantasma` y `destructivo`, más `icono`, `compacto`, `cargando` y `BotonEnlace` para navegar. En una página:

```tsx
<Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>
```

**Destino:** `design-system/`, con `styles/`.
