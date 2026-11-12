# Pruebas del frontend

```sh
npm test           # vitest run
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build
```

CI ejecuta las cuatro órdenes en cada PR.

## Qué se prueba

| Qué | Cómo |
|---|---|
| Lógica pura (`utils/`, `config/`, `router/`, `sesion/`) | Vitest, sin DOM. Es lo prioritario |
| Clientes de la API (`services/api/`) | Vitest con `fetch` simulado: rutas, cabeceras, errores y reintentos |
| Cola sin conexión | Vitest con IndexedDB simulado: orden, reintentos, idempotencia |
| Componentes (`design-system/` primero) | Vitest con Testing Library y jsdom: comportamiento y accesibilidad. La lógica compleja se sigue sacando a `utils/` |

## Pruebas de componentes

Plantilla: `src/design-system/Boton.test.tsx`.

- Fichero `Componente.test.tsx` junto al componente, con `// @vitest-environment jsdom` en la primera línea. El resto de pruebas sigue en Node, que es más rápido.
- `afterEach(cleanup)` al principio del fichero.
- Consultas por rol y nombre accesible (`getByRole('button', { name: 'Guardar' })`), como las usaría un lector de pantalla. `getByTestId` solo si no hay otra forma.
- Interacción con `userEvent.setup()`, también con teclado (`usuario.tab()`, `usuario.keyboard('{Enter}')`).
- Se prueba el comportamiento y los atributos ARIA, no las clases CSS ni la estructura interna.
- Los componentes que navegan se envuelven en `MemoryRouter`.
- Cada componente base de `design-system/` lleva su prueba; los nuevos, desde el primer PR.

## Reglas

- Cada prueba va junto al fichero que prueba: `filtrosBandeja.test.ts`.
- Las pruebas no llaman a la red. Los servicios se simulan.
- Las fechas se fijan en la prueba (`vi.setSystemTime`): nada depende del día ni de la zona del ordenador.
- Cada corrección de un bug llega con la prueba que lo reproduce.
- Una prueba que falla de forma intermitente se arregla o se elimina en el mismo día.
