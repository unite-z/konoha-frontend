# Estilo de código TypeScript y React

## Herramientas

- TypeScript en modo `strict`. `tsc -b` sin errores.
- oxlint sin errores (`npm run lint`).
- CSS Modules con los tokens de `src/styles/tokens.css`. Qué componente y qué token usar: `DESIGN.md`.

## Estructura de `src/`

Qué va en cada carpeta, qué puede importar a qué y cómo se comunican los módulos: `src/README.md` y el README de cada carpeta.

## Nombres

- Componentes y su CSS en PascalCase: `BarraAvance.tsx` y `BarraAvance.module.css`.
- Hooks: `useAlgo.ts`. Resto de ficheros TS en camelCase, como ya hace el repo (`clienteTercerizados.ts`). Nunca en kebab-case (`cliente-tercerizados.ts` no vale).
- Carpetas en kebab-case, salvo la carpeta de un componente con varios ficheros (`LayoutOficina/`).
- Pruebas junto al fichero que prueban: `instanteLima.test.ts`.
- Dominio en español: `AtencionTercerizada`, `registrarInicio`.

## TypeScript

- Nada de `any`. Si el tipo es desconocido, se usa `unknown` y se acota.
- Nada de `!` (non-null assertion) salvo con un comentario que explique por qué es seguro.
- Los tipos de la API viven en `types/` y reflejan el contrato de OpenAPI, con sus claves en snake_case (ADR 0005). Es la única excepción a camelCase. Si el backend cambia el contrato, se cambian aquí en el mismo ticket.
- `import type` para lo que solo es tipo (`verbatimModuleSyntax` lo exige).

## React

- Componentes de función. Un componente exportado por fichero.
- Estado del servidor con `useConsulta` y los servicios de `services/api/`. Estado de la URL (filtros, página) con `useFiltrosUrl` y `usePaginaActual`.
- Toda pantalla con datos remotos muestra los tres estados: `EstadoCarga`, `EstadoError` y `EstadoVacio`.
- La interfaz oculta lo que el rol no puede hacer (`config/permisos*.ts`), pero **quien decide es el backend**. Siempre se maneja el 403.
- Fechas y horas con `utils/instanteLima.ts`: la zona de negocio es `America/Lima`, no la del navegador.

## Estilos

- CSS Modules, un `.module.css` por componente.
- Colores, espacios, tipografía y radios **solo con tokens**. Nada de colores escritos a mano.
- Sin estilos en línea, salvo valores calculados en tiempo de ejecución.

## Accesibilidad

- Cada control de formulario tiene su `label`.
- Los encabezados siguen el orden (`h1`, `h2`...) sin saltos.
- Se puede usar todo con teclado y el foco va donde corresponde tras una acción (por ejemplo, tras registrar).
- Imágenes con `alt`. Los iconos decorativos, con `aria-hidden`.

## Configuración y secretos

- Variables `VITE_*` en `.env` (copia de `.env.example`). **Todo lo que empieza por `VITE_` llega al navegador**: nunca es un secreto.
- Las rutas de la API son relativas (`/api/v1`). En local, el proxy de Vite las envía al backend en el puerto 8000.
