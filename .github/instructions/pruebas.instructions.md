---
applyTo: "src/**/*.test.ts,src/**/*.test.tsx"
---

# Pruebas del frontend (Vitest)

- Cada prueba va junto al fichero que prueba: `filtrosBandeja.test.ts`.
- Las pruebas no llaman a la red: `fetch` y los servicios se simulan.
- Las fechas se fijan con `vi.setSystemTime`: nada depende del día ni de la zona del ordenador.
- Prioridad: lógica pura de `utils/`, `config/`, `router/` y `sesion/`; clientes de `services/api/` (rutas, cabeceras, errores y reintentos); cola sin conexión (orden, reintentos e idempotencia).
- Si un componente tiene lógica que merece prueba, se saca a una función pura y se prueba esa función.
- Cada corrección de un bug llega con la prueba que lo reproduce.
- Una prueba intermitente se arregla o se elimina en el mismo día; ninguna se desactiva sin ticket.
