# `pages/servicios-tercerizados/` (MOD-05)

Atenciones tercerizadas y sus maestros. En la raíz están la bandeja y la ficha (`AtencionesPage`, `AtencionDetallePage`). Subcarpetas:

- `nueva/`: asistente de registro de una atención (`NuevaAtencionPage` y sus pasos);
- `acciones/`: diálogos que cambian el estado de una atención (orden de compra, inicio y fin, informe, origen, acuerdo). Al adjuntar el informe, `DatosInformeFinal` pide los datos del formato estándar del tipo de servicio (RF-SER-009) cuando hay un «Informe final»;
- `maestros/`: proveedores, contratos y control fitosanitario (`MarcarEjemplarPage`, RF-INV-011).

| Qué | Dónde |
|---|---|
| Servicios | `services/api/tercerizados.ts`, `maestrosTercerizados.ts`, `clienteTercerizados.ts` |
| Tipos | `types/tercerizados.ts`, `types/maestrosTercerizados.ts` |
| Lógica pura | `utils/estadosTercerizados.ts`, `nuevaAtencion.ts`, `filtrosBandeja.ts`, `validacionTercerizados.ts`, `validacionMaestros.ts`, `datosInformeFinal.ts` |
| Permisos | `config/permisosTercerizados.ts`, `config/permisosMaestros.ts` |
| Componentes propios | `components/tercerizados/LineaEstados.tsx` |
| Rutas | `RUTAS_TERCERIZADOS`, `rutaDetalleAtencion(id)` (prefijo `/servicios-tercerizados`) |

**Entre módulos:**
- Marcar un ejemplar (`MarcarEjemplarPage`) llama solo a `marcarAtencionEspecial` de este módulo: el backend resuelve el vínculo con inventario.
- `listarAreasVerdes` y `listarEjemplares` de `tercerizados.ts` son datos de MOD-02. Pasarán a su módulo dueño.
- MOD-06 lee atenciones e informes de aquí. Lo que se le ofrezca a otro módulo se documenta como API pública del módulo.

**Ejemplo:** `AtencionDetallePage.tsx` usa `Adjuntos` e `HistorialCambios` de `components/core/` y los diálogos de `acciones/`.

**Destino:** `modulos/servicios-tercerizados/paginas/`.
