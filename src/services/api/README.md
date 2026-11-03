# `services/api/`

El único sitio donde se llama a la API. `comprobar-estilos.sh` rechaza `fetch` fuera de `src/services/`.

**Va aquí:**
- `cliente.ts`: base HTTP (`solicitar`), `ErrorApi`, `aErrorApi` e `interpretarError`, que traduce las respuestas de error (401, 403 y los dos formatos del ADR 0004).
- Un fichero de servicios por módulo o funcionalidad, con funciones tipadas que devuelven tipos de `types/`.

**No va aquí:**
- Estado de React ni hooks: van en `hooks/` o en el módulo.
- Transformaciones para pintar: van en `utils/`.
- Datos simulados: van en `services/simulados/`.

**Reglas:**
- Cada función acepta `signal?: AbortSignal` para que `useConsulta` pueda cancelar.
- No se crean más clientes HTTP. Hoy hay cinco (`cliente`, `clienteCore`, `clientePlanificacion`, `clienteReportesGestion`, `clienteTercerizados`) y se unificarán. Lo nuevo usa el del módulo o `cliente.ts`.
- Un módulo solo llama a servicios de otro para leer, y nunca para orquestar una acción entre módulos (eso lo resuelve el backend).

**Nombres:** camelCase por módulo (`tercerizados.ts`, `maestrosTercerizados.ts`); funciones con verbo e infinitivo (`listarAtenciones`, `obtenerAtencion`, `registrarInicio`); prueba al lado (`clienteTercerizados.test.ts`).

**Ejemplo:** `registrarInicio(id, instante, signal)` en `tercerizados.ts`.

**Destino:** `cliente.ts` a `compartido/api/`; el resto a `modulos/<modulo>/api/`.
