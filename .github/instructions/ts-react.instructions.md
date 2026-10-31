---
applyTo: "src/**/*.ts,src/**/*.tsx,src/**/*.css"
---

# TypeScript, React y estilos (konoha-frontend)

## TypeScript

- Nada de `any`: se usa `unknown` y se acota.
- Nada de `!` (non-null assertion) salvo con un comentario que explique por qué es seguro.
- `import type` para lo que solo es tipo.
- Los tipos de la API viven en `src/types/`, por módulo, y reflejan OpenAPI con claves en snake_case. Si el backend cambia el contrato, se cambian en el mismo ticket.

## Estructura de `src/`

- `pages/<modulo-en-kebab-case>/`: pantallas por módulo.
- `components/ui/`: componentes base reutilizables. Antes de crear uno, comprueba si ya existe. `components/<modulo>/`: los propios de un módulo.
- `services/api/`: un cliente por módulo con funciones tipadas. **Ninguna pantalla ni componente llama a `fetch` directamente.**
- `hooks/` compartidos, `utils/` (lógica pura, con pruebas), `config/` (permisos de interfaz por rol), `sesion/`, `router/`, `layouts/`, `styles/`.

## React

- Componentes de función y un componente exportado por fichero.
- Estado del servidor con `useConsulta` y los servicios de `services/api/`. Filtros y página en la URL con `useFiltrosUrl` y `usePaginaActual`.
- Toda pantalla con datos remotos muestra los tres estados: `EstadoCarga`, `EstadoError` y `EstadoVacio`, y maneja el 403.
- Lo que el rol no puede hacer se oculta con `config/permisos*.ts`.
- Fechas y horas con `utils/instanteLima.ts`: la zona de negocio es `America/Lima`, nunca la del navegador.
- Rutas de la API relativas (`/api/v1/...`). Importes y medidas llegan como texto decimal: no se convierten a `number` para calcular.

## Estilos

- CSS Modules: un `.module.css` por componente.
- Colores, espacios, tipografía y radios **solo con los tokens de `src/styles/tokens.css`**. Nada de colores ni medidas escritos a mano.
- Sin estilos en línea, salvo valores calculados en tiempo de ejecución.

## Accesibilidad

- Cada control de formulario tiene su `label`. Los encabezados siguen el orden, sin saltos.
- Todo se puede usar con teclado y el foco va donde corresponde tras una acción.
- Imágenes con `alt`; iconos decorativos con `aria-hidden`.

## Sin conexión (PWA)

- Las operaciones de campo se guardan primero en la cola de IndexedDB con un UUID generado en el cliente, que también va en la cabecera `Idempotency-Key`. Los reintentos repiten el mismo UUID.
- 4xx de validación o permiso: la operación se marca como rechazada y no se reintenta. 5xx o sin red: se reintenta con backoff.
- No se guardan en el dispositivo credenciales en claro ni datos de otros usuarios.
