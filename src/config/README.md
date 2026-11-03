# `config/`

Permisos de interfaz por rol y configuración que llega al navegador.

| Fichero | Módulo |
|---|---|
| `permisosCore.ts` | MOD-01 (`PERMISOS`, códigos de `core_permiso`); lo usan también el menú y MOD-02 |
| `permisosPlanificacion.ts` | MOD-03 |
| `permisosTercerizados.ts`, `permisosMaestros.ts` | MOD-05 |
| `permisos.ts`, `sesion.ts` | MOD-06 (matriz de permisos y nombres de rol) |
| `datosSimulados.ts` | interruptor de los datos simulados de MOD-06 |

**Regla de oro:** la interfaz solo oculta lo que el rol no puede hacer. **Quien decide es el backend**, y toda pantalla maneja el 403.

**No va aquí:**
- Secretos: cualquier `VITE_*` llega al navegador.
- La sesión (`sesion/`) ni las rutas (`router/`).
- Permisos de un módulo dentro del fichero de otro: cada módulo tiene el suyo.

**Nombres:** `permisos<Modulo>.ts` en camelCase, con su prueba al lado (`permisosTercerizados.test.ts`).

**Ejemplo:** `MarcarEjemplarPage.tsx` muestra el formulario solo si `puedeMarcarAtencionEspecial(rol)` de `permisosMaestros.ts` lo permite. El backend lo vuelve a comprobar.

**Destino:** `app/permisos/`; `datosSimulados.ts` a MOD-06.
