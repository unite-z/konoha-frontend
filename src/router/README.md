# `router/`

Rutas de la aplicación.

| Fichero | Qué hay |
|---|---|
| `rutas.tsx` | el árbol de rutas: guardianes, layout y la pantalla de cada ruta |
| `rutasApp.ts` | constantes de ruta, funciones de ruta y migas de MOD-01, 02, 03, 05 y 06 |
| `rutasCampo.ts` | lo mismo para MOD-04 |

**Regla:** ninguna URL escrita a mano en pantallas, componentes ni CSS. Siempre una constante (`RUTAS_TERCERIZADOS.atenciones`) o una función (`rutaDetalleAtencion(id)`, `rutaDetalleUsuario(id)`). Es la vía para enlazar con otro módulo.

**Cómo añadir una ruta:**
1. Constante o función en el bloque de tu módulo de `rutasApp.ts` (o en `rutasCampo.ts`).
2. Entrada en `rutas.tsx` dentro del guardián de tu módulo.
3. Si va en el menú, entrada en `layouts/LayoutOficina/MenuLateral.tsx`.

**No va aquí:** la lógica de permisos (`config/`) ni la de sesión (`sesion/`). `rutasApp.ts` no puede importar pantallas, para evitar dependencias circulares.

**Ejemplo:** `rutaDetalleAtencion(id)` la usan MOD-05 y cinco ficheros de MOD-06 (`TablaRegistros.tsx`, `MapaAtencionesPage.tsx`…).

**Destino:** `rutas.tsx` a `app/`; cada bloque de `rutasApp.ts` al `rutas.ts` de su módulo.
