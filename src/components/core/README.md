# `components/core/`

Componentes de negocio comunes a varios módulos. Nacieron en MOD-01 para las fichas del resto de módulos.

**Va aquí:** piezas con lógica de negocio que usan tres módulos o más (o que se diseñaron para todos): `Adjuntos.tsx` (ficheros de una ficha) e `HistorialCambios.tsx` (quién cambió qué y cuándo).

**No va aquí:**
- Componentes visuales sin negocio: van en `components/ui/`.
- Componentes de un solo módulo: van junto a sus páginas o en `components/<modulo>/`.
- Componentes que hoy usa un módulo y «quizá» otro mañana: se quedan en su módulo hasta que haya un tercer usuario.

**Nombres:** PascalCase, un componente por fichero, con su `.module.css` si lo necesita.

**Ejemplo:** `AtencionDetallePage.tsx` (MOD-05) muestra los ficheros de una atención con `<Adjuntos>`, que sale de aquí y llama a los servicios de MOD-01.

**Destino:** `compartido/`.
