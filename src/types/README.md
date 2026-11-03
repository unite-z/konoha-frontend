# `types/`

Tipos del contrato con la API, un fichero por módulo o funcionalidad. Reflejan los serializadores del backend tal cual.

**Va aquí:** respuestas y entradas de la API (`Atencion`, `ReporteProveedor`, `CrearAtencionEntrada`) y tipos de valor del contrato (`FechaIso`, `InstanteIso` en `comun.ts`).

**No va aquí:**
- Props de componentes: van en el propio componente.
- Tipos de vista o de formulario: van junto a la lógica que los construye (`utils/` o la página).
- Tipos de otro módulo copiados. Se importan del fichero del módulo dueño.

**Reglas:**
- Claves en snake_case como el contrato (ADR 0005). Es la única excepción a camelCase.
- Si el backend cambia el contrato, el tipo se cambia en el mismo ticket.
- Se importan con `import type`.

**Nombres:** fichero en camelCase igual que su servicio (`types/tercerizados.ts` ↔ `services/api/tercerizados.ts`). Tipos en PascalCase.

**Ejemplo:** `types/tercerizados.ts` define `Atencion`. La usan MOD-05 y, para leer, MOD-06 (`SolicitudAnalisis.tsx`).

**Destino:** `modulos/<modulo>/tipos/`; `comun.ts` a `compartido/`.
