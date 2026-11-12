# `src/`

Código de la PWA. Este fichero dice **dónde va cada cosa y quién puede importar a quién**. Las reglas generales (gates, nombres, seguridad, decisiones cerradas) están en [`AGENTS.md`](../AGENTS.md), y el aspecto visual en [`DESIGN.md`](../DESIGN.md). No se repiten aquí.

> **Estructura en transición.** Las carpetas actuales se reorganizarán después del pase a producción del 18/11 (plan de refactor del front, [AV-330](https://linear.app/unite-z/issue/AV-330)). Hasta entonces, **el código nuevo va en la carpeta actual que le corresponda, pero cumpliendo ya las reglas de dependencias de abajo**. Cada README se actualiza en el mismo PR que mueva su carpeta.

## Mapa de carpetas

| Carpeta actual | Qué hay | Destino |
|---|---|---|
| `main.tsx`, `App.tsx` | arranque y proveedores | `app/` |
| `router/` | rutas y migas | `app/rutas.tsx` y `modulos/<m>/rutas.ts` |
| `sesion/` | sesión de MOD-01 y guardianes de ruta | `app/sesion/` |
| `config/` | permisos de interfaz por rol | `app/permisos/` (`datosSimulados.ts` a MOD-06) |
| `layouts/` | `LayoutOficina`: cabecera, menú y migas | `app/layout/` |
| `styles/` | `tokens.css` y `global.css` | `design-system/` |
| `components/ui/` | componentes base del sistema de diseño | `design-system/` |
| `components/core/` | `Adjuntos` e `HistorialCambios` | `compartido/` |
| `components/reportes-indicadores/` | componentes solo de MOD-06 | `modulos/reportes-indicadores/componentes/` |
| `components/tercerizados/` | componentes solo de MOD-05 | `modulos/servicios-tercerizados/componentes/` |
| `pages/<modulo>/` | pantallas de cada módulo | `modulos/<modulo>/paginas/` (MOD-01 en `modulos/core/`) |
| `services/api/cliente.ts` | cliente HTTP base | `compartido/api/` |
| `services/api/<modulo>.ts` | servicios de cada módulo | `modulos/<modulo>/api/` |
| `services/simulados/` | datos simulados de MOD-06 | `modulos/reportes-indicadores/api/` (D9: se quedan con aviso visible) |
| `types/` | tipos del contrato de la API | `modulos/<modulo>/tipos/` (`comun.ts` a `compartido/`) |
| `utils/` | lógica pura con pruebas | `compartido/` (`formato`, `instanteLima`) o `modulos/<modulo>/utils/` |
| `hooks/` | hooks compartidos | `compartido/` |
| `sincronizacion/` | modo sin conexión (RF-T-012): almacén IndexedDB, cola común, lecturas descargadas y registro del service worker | `compartido/sincronizacion/` (`ejecutores.ts` y `ProveedorSincronizacion` a `app/`) |

Cada carpeta con README propio explica qué va y qué no.

## Dirección de las dependencias

```
app (router, sesion, config, layouts)
  └─> pages/<modulo> + components/<modulo>     (un módulo)
        └─> components/core, hooks, utils genéricas, services/api/cliente.ts   (compartido)
              └─> components/ui + styles        (sistema de diseño)
```

- Se importa solo hacia abajo. `components/ui` no importa de páginas, servicios ni configuración. Hoy usa `utils/formato.ts` y los hooks genéricos `useConsulta` y `useDemora`; nada más.
- Un módulo no importa pantallas, componentes ni `utils` de otro módulo.
- Excepciones heredadas que no se copian:
  - `components/ui/FiltroMes.tsx` importa `validarMes` de `utils/reportesGestion.ts`, que es de MOD-06;
  - `utils/estados.ts` y `utils/estadosTercerizados.ts` importan tipos de `components/ui`;
  - `hooks/usePaginaActual.ts` importa de `layouts/`.

## Cómo habla un módulo con otro

Por orden de preferencia:

| Vía | Cuándo | Ejemplo real |
|---|---|---|
| 1. **Backend** | la acción cambia datos de otro módulo | `MarcarEjemplarPage` (MOD-05) marca un ejemplar de inventario llamando solo a `marcarAtencionEspecial` de su propio servicio. El servidor resuelve el resto. Igual con derivar una incidencia de MOD-03 a MOD-04 o MOD-05 (AV-277, AV-278): el front llama al endpoint de MOD-03 y no orquesta. |
| 2. **URL** | enlazar a una pantalla de otro módulo | MOD-06 enlaza a una atención de MOD-05 con `rutaDetalleAtencion(id)` de `router/rutasApp.ts` (`MapaAtencionesPage.tsx`, `TablaRegistros.tsx`). Nunca una URL escrita a mano. |
| 3. **Entrada pública** | leer datos de otro módulo | Hoy, solo funciones de `services/api/<modulo-dueño>.ts` y tipos de `types/<modulo-dueño>.ts`. Ejemplo: `SolicitudAnalisis.tsx` (MOD-06) usa `listarAtenciones` de `services/api/tercerizados.ts`. Al reorganizar, pasará a ser `@/modulos/servicios-tercerizados` (su `index.ts`). |
| 4. **`app/`** | sesión, permisos, menú, avisos | `usePermisos()` de `sesion/ContextoSesion.ts` y `PERMISOS` de `config/permisosCore.ts`. Las reglas de interfaz deciden por permiso, nunca por el nombre del rol (AV-382). Nada de bus de eventos global. |

- Si una pieza la usan tres módulos o más, sube a compartido (`components/core`, `hooks`, `utils`).
- Cada catálogo es de su módulo dueño: áreas verdes, sectores y ejemplares son de MOD-02, y los tipos de servicio tercerizado, de MOD-05.
- Si un caso no encaja en estas cuatro vías, se pregunta antes de inventar una quinta.

## Sistema de diseño en tres reglas

1. **Solo componentes de `components/ui`.** Nada de `<button>`, `<input>`, `<select>`, `<dialog>` ni `<table>` crudos en páginas. Si falta un componente, se añade a `ui` (primero en Figma, ver `DESIGN.md`).
2. **Solo tokens semánticos** de `styles/tokens.css`: `--color-*`, `--space-*`, `--radius-*` y `--type-*`. Nada de primitivos (`--green-700`, `--neutral-300`), colores, px (salvo bordes de 1 y 2 px) ni `style={…}`.
3. **El CSS de una página solo coloca:** rejilla, huecos y anchos. Botones, tarjetas, chips y campos ya tienen su aspecto en `ui`.

`comprobar-estilos.sh` ya rechaza colores a mano y, en líneas nuevas, px y `style={…}`. El resto lo revisa la persona que aprueba el PR hasta que entre en CI (fase 4 del plan).
