# Cómo contribuir al frontend

Las normas comunes (ticket, rama, commit, PR, calendario) están en `CONTRIBUTING.md` y `docs/estandares/git-y-prs.md` de `konoha-infra`. Aquí solo va lo específico del frontend.

## Una vez por clon

```sh
git config core.hooksPath .githooks
npm install
cp .env.example .env
```

## Antes de abrir el PR

```sh
npm run typecheck && npm run lint && npm test && npm run build
```

- Si la pantalla cambia, adjunta capturas en el PR (escritorio y móvil).
- Si dependes de un cambio del backend, enlaza su PR y fusiona primero el del backend.

## Checklist de revisión

- [ ] Sin `any` ni `!` sin justificar.
- [ ] Los datos remotos pasan por `services/api/` y la pantalla tiene sus estados de carga, error y vacío.
- [ ] Solo se usan tokens, sin colores ni medidas a mano.
- [ ] Se puede usar con teclado y los `label` están bien.
- [ ] La lógica nueva tiene pruebas.
- [ ] No hay nada secreto en `VITE_*`.
