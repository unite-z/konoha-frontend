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
| Componentes | Cuando se añada Testing Library (ticket propio). Mientras tanto, la lógica se saca de los componentes para poder probarla |

## Reglas

- Cada prueba va junto al fichero que prueba: `filtrosBandeja.test.ts`.
- Las pruebas no llaman a la red. Los servicios se simulan.
- Las fechas se fijan en la prueba (`vi.setSystemTime`): nada depende del día ni de la zona del ordenador.
- Cada corrección de un bug llega con la prueba que lo reproduce.
- Una prueba que falla de forma intermitente se arregla o se elimina en el mismo día.
