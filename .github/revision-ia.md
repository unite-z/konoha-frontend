Normas de konoha-frontend (React 19, Vite y TypeScript estricto) para la revisión con IA. Proyecto de curso: gestión de las áreas verdes del campus de la PUCP.

Revisa sobre todo:

- Errores de lógica, casos sin manejar y fallos que el tipado no detecta.
- Nada de `any`: `unknown` y acotar. `!` solo con un comentario que explique por qué es seguro.
- Ninguna pantalla llama a `fetch`: los datos pasan por `services/api/` y los tipos del contrato viven en `types/`, con claves en snake_case.
- Toda pantalla con datos remotos muestra `EstadoCarga`, `EstadoError` y `EstadoVacio`, y maneja el 403.
- La interfaz oculta lo que el rol no puede hacer (`config/permisos*.ts`), pero quien decide es el backend.
- Fechas con `utils/instanteLima.ts` (zona America/Lima), nunca la zona del navegador.
- Estilos con CSS Modules y solo con los tokens de `src/styles/tokens.css`: sin colores ni medidas a mano ni estilos en línea.
- Accesibilidad: `label` en cada control, encabezados en orden, uso con teclado y `alt` en las imágenes.
- Nada secreto en variables `VITE_*`: llegan al navegador.
- Nombres: componentes en PascalCase, el resto de ficheros TS en camelCase, carpetas en kebab-case y el dominio en español.
- La lógica nueva de `utils/` tiene pruebas.

No comentes el formato (lo revisan oxlint y tsc) ni el título o la rama del PR (los revisa CI).
