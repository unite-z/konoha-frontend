# `layouts/`

Estructura común de las pantallas de oficina: `LayoutOficina/`.

| Fichero | Qué hace |
|---|---|
| `LayoutOficina.tsx` | rejilla con menú lateral, cabecera y contenido |
| `MenuLateral.tsx` | menú principal por permisos |
| `entradasMenuLateral.ts` | entradas de cada módulo y regla única del elemento activo, con prueba |
| `Cabecera.tsx` | migas y título de la página; búsqueda global y usuario con su rol |
| `BarraContexto.tsx` | migas de pan |
| `ContextoPagina.ts` | título y migas que declara cada página con `usePaginaActual` |

**Reglas:**
- Cada página declara su título y sus migas con `usePaginaActual`. La cabecera no conoce las páginas.
- En el menú solo puede haber **un elemento activo**. Un módulo nuevo añade su entrada en `MODULOS_MENU` (`entradasMenuLateral.ts`), con sus prefijos de URL; nunca se calcula el activo a mano en `MenuLateral.tsx`.
- Sin barra de acento vertical en el elemento activo: el diseño de Figma marca el activo con fondo (`menu/activo`) y texto (`menu/texto-activo`).

**No va aquí:**
- Estilos de pantallas concretas. La excepción heredada de MOD-04 (`@media` con `a[href^='/operacion-campo']` en `LayoutOficina.module.css`) se sustituirá por la navegación móvil.
- Permisos: el menú los lee de `config/permisosCore.ts` (`entradasMenu`, `puede`).

**Ejemplo:** `CoberturasPage.tsx` llama a `usePaginaActual` con `MIGAS_INVENTARIO` y la cabecera pinta «Áreas verdes / Coberturas vegetales».

**Destino:** `app/layout/`.
