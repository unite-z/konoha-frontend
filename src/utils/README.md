# `utils/`

Lógica pura con pruebas: formato, fechas, validaciones y transformaciones. Sin React, sin `fetch` y sin estado.

**Va aquí:**
- Genéricas, para todos los módulos: `formato.ts` (fechas, cifras y duraciones de la Guía Web) e `instanteLima.ts` (zona America/Lima).
- De un módulo, con su nombre: `validacionTercerizados.ts`, `planificacion.ts`, `reportesGestion.ts`…

**No va aquí:**
- Llamadas a la API: van en `services/api/`.
- Hooks: van en `hooks/` o en el módulo.
- Componentes, ni imports de `components/`. Hoy `estados.ts`, `estadosTercerizados.ts` y `calendarioRestricciones.ts` importan tipos de `components/ui`: no se copia.

**Reglas:**
- Cada fichero lleva su prueba al lado (`formato.test.ts`).
- Fechas y horas siempre con `instanteLima.ts`, nunca con la zona del navegador.
- Un módulo no importa los `utils` de otro. Si lo necesita, la función sube a genérica (cuando la usan tres módulos) o se pide al dueño.

**Nombres:** camelCase con el módulo de sufijo cuando es de un módulo (`validacionCore.ts`, `etiquetasCore.ts`).

**Ejemplo:** `instanteLima.ts` da `hoyLima()`, que usa `CalendarioRestriccionesPage.tsx`; su prueba está en `instanteLima.test.ts`.

**Destino:** `formato.ts` e `instanteLima.ts` a `compartido/`; el resto a `modulos/<modulo>/utils/`.
