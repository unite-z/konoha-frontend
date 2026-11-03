# `layouts/`

Estructura común de las pantallas de oficina: `LayoutOficina/`.

| Fichero | Qué hace |
|---|---|
| `LayoutOficina.tsx` | rejilla con menú lateral, cabecera y contenido |
| `MenuLateral.tsx` | menú principal por permisos |
| `Cabecera.tsx` | migas y título de la página; búsqueda global y usuario con su rol |
| `BarraContexto.tsx` | migas de pan |
| `ContextoPagina.ts` | título y migas que declara cada página con `usePaginaActual` |

**Reglas:**
- Cada página declara su título y sus migas con `usePaginaActual`. La cabecera no conoce las páginas.
- En el menú solo puede haber **un módulo activo**. Hoy cada módulo calcula su activo a su manera; la fase 2 del plan lo pasa a una lista de entradas con una sola regla.
- Sin barra de acento vertical en el elemento activo: el diseño de Figma marca el activo con fondo (`menu/activo`) y texto (`menu/texto-activo`).

**No va aquí:**
- Estilos de pantallas concretas. La excepción heredada de MOD-04 (`@media` con `a[href^='/operacion-campo']` en `LayoutOficina.module.css`) se sustituirá por la navegación móvil.
- Permisos: el menú los lee de `config/permisosCore.ts` (`entradasMenu`, `puede`).

**Ejemplo:** `CoberturasPage.tsx` llama a `usePaginaActual` con `MIGAS_INVENTARIO` y la cabecera pinta «Áreas verdes / Coberturas vegetales».

**Destino:** `app/layout/`.
