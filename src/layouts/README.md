# `layouts/`

Estructura común de las pantallas de oficina: `LayoutOficina/`.

| Fichero | Qué hace |
|---|---|
| `LayoutOficina.tsx` | rejilla con menú lateral, cabecera y contenido; pinta el h1 de la página al principio del contenido |
| `MenuLateral.tsx` | menú principal por permisos |
| `entradasMenuLateral.ts` | entradas de cada módulo (con iconos), regla única del elemento activo y secciones móviles, con prueba |
| `BarrasMoviles.tsx` | Barra superior móvil y Barra inferior, por debajo de 768 px |
| `Cabecera.tsx` | migas de la página; búsqueda global y usuario con su rol (sin título) |
| `BarraContexto.tsx` | migas de pan |
| `ContextoPagina.ts` | título y migas que declara cada página con `usePaginaActual`, y el hueco de acciones del título |
| `AccionesPagina.tsx` | lleva la acción principal de la página (Botón primario) a la derecha del h1, con un portal |
| (móvil) | el h1 queda solo para lectores de pantalla: el título va en la barra superior; la barra inferior usa `textoMovil` si la entrada lo tiene («Ajustes») |
| `AccionMovil.tsx` | lleva la acción de la página a la barra superior móvil (el «+» del Calendario), con un portal |
| `JuntoTitulo.tsx` | lleva lo que va pegado al h1 (el estado del registro, como en «Detalle de ciclo») justo detrás del título, con un portal |

**Reglas:**
- Cada página declara su título y sus migas con `usePaginaActual`, y no pinta su propio h1: el layout lo pone al principio del contenido. La acción principal («Registrar…») va en `<AccionesPagina>`, no en una barra propia de la página, y el estado del registro, en `<JuntoTitulo>`. La cabecera no conoce las páginas.
- En el menú solo puede haber **un elemento activo**. Un módulo nuevo añade su entrada en `MODULOS_MENU` (`entradasMenuLateral.ts`), con sus prefijos de URL; nunca se calcula el activo a mano en `MenuLateral.tsx`.
- Sin barra de acento vertical en el elemento activo: el diseño de Figma marca el activo con fondo (`menu/activo`) y texto (`menu/texto-activo`).
- Sin línea recta entre el menú y el contenido: en escritorio, el contenido va en un panel redondeado (`.columna` de `LayoutOficina.module.css`) y el menú, sin borde, sobre el fondo de la aplicación.

**No va aquí:**
- Estilos de pantallas concretas: la navegación móvil es la misma para todos los módulos.
- Permisos: el menú los lee de `config/permisosCore.ts` (`entradasMenu`, `puede`).

**Ejemplo:** `CoberturasPage.tsx` llama a `usePaginaActual` con `MIGAS_INVENTARIO` y la cabecera pinta «Áreas verdes / Coberturas vegetales».

**Destino:** `app/layout/`.
