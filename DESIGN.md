# DESIGN.md: sistema de diseño de Áreas Verdes

> **Estado actual.** El sistema de diseño está aprobado (AV-272). El código se migra por fases ([AV-330](https://linear.app/unite-z/issue/AV-330)): los tokens y la fuente llegan en la fase 0 (AV-331) y los componentes en la fase 1. Lo que aún no existe en código se marca como **pendiente**.

Los README de `src/` dicen dónde va el código. Este documento dice cómo tiene que verse.

## 1. Principios

1. **Todo sale del sistema de diseño.** Cada pantalla se compone con componentes de `src/components/ui` y tokens de `src/styles/tokens.css`.
2. **Un cambio en un componente cambia todo el sistema.** Si un botón tiene que cambiar, se cambia `Boton`, no la pantalla.
3. **Nada de componentes rehechos en páginas.** Ni botones, ni tarjetas, ni chips, ni campos con CSS propio.
4. **Solo tokens semánticos.** `--color-*`, `--space-*`, `--radius-*` y `--type-*`. Nunca primitivos (`--green-700`), colores ni px.
5. **Claro y oscuro a través de variables.** Ningún componente sabe en qué modo está: solo usa tokens.

## 2. Fuente de verdad

- Figma `KXRcYHPgVOkPZskPCFPoQj`, página «Sistema de diseño · Áreas Verdes» (nodo 333-2): https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=333-2
- Ejemplo vivo de pantallas: «MOD-03 · Propuesta SaaS» (nodo 344-2): https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=344-2
- **Si Figma y el código discrepan, manda Figma** y se abre una incidencia en Linear (equipo AV) para corregir el código, o el diseño si el error está en Figma.
- Las variables de color y dimensión de Figma ya llevan como nombre de código el de `tokens.css` (por ejemplo, «acento/default» se llama `--color-action-primary`).

## 3. Tokens

### 3.1 Color (colección «AV · Color»)

| Figma | Token CSS | Claro | Oscuro | Uso |
|---|---|---|---|---|
| fondo/app | `--color-bg-page` | #f8fafc | #020617 | fondo de la aplicación |
| fondo/panel | `--color-bg-surface` | #ffffff | #0f172a | tarjetas, tablas, diálogos, menú |
| fondo/sutil | `--color-bg-subtle` | #f1f5f9 | #1e293b | cabecera de tabla, pestañas, zonas secundarias |
| fondo/hover | `--color-bg-hover` | #f1f5f9 | #1e293b | fila o elemento al pasar el ratón |
| texto/principal | `--color-text-primary` | #0f172a | #f8fafc | texto normal y títulos |
| texto/secundario | `--color-text-muted` | #64748b | #94a3b8 | descripciones, leyendas, metadatos |
| texto/deshabilitado | `--color-text-disabled` | #94a3b8 | #475569 | controles deshabilitados, celdas sin valor |
| texto/sobre-acento | `--color-text-on-action` | #ffffff | #ffffff | texto sobre botón primario o destructivo |
| borde/default | `--color-border-default` | #e2e8f0 | #1e293b | bordes de tarjeta, tabla y campo |
| borde/fuerte | `--color-border-strong` | #cbd5e1 | #334155 | bordes que deben verse más (campo con foco perdido, separadores) |
| acento/default | `--color-action-primary` | #2563eb | #2563eb | botón primario, elemento seleccionado |
| acento/hover | `--color-action-primary-hover` | #1d4ed8 | #1d4ed8 | hover del botón primario |
| acento/texto | `--color-action-text` | #2563eb | #60a5fa | enlaces, botón fantasma, códigos enlazados |
| acento/sutil | `--color-action-subtle` | #eff6ff | #172a4f | fondo de un elemento seleccionado suave |
| foco | `--web-focus-ring-color` | #2563eb | #60a5fa | anillo de foco de 2 px |
| menu/activo | `--color-sidebar-active-bg` | #dbeafe | #172a4f | fondo del elemento de menú activo |
| menu/texto-activo | `--color-sidebar-active-text` | #1d4ed8 | #60a5fa | texto del elemento de menú activo |

Estados (texto, fondo y borde, en claro / oscuro):

| Figma | Texto | Fondo | Borde | Uso |
|---|---|---|---|---|
| estado/info | `--color-info` #1d4ed8 / #60a5fa | `--color-info-bg` #eff6ff / #1c2e4b | `--web-info-border` #bfdbfe / #1e40af | información, «en curso» |
| estado/exito | `--color-success` #15803d / #4ade80 | `--color-success-bg` #f0fdf4 / #173336 | `--web-success-border` #bbf7d0 / #166534 | conforme, completado |
| estado/aviso | `--color-warning` #b45309 / #fbbf24 | `--color-warning-bg` #fffbeb / #302f29 | `--web-warning-border` #fde68a / #92400e | requiere atención, plazo cerca |
| estado/error | `--color-error` #b91c1c / #f87171 | `--color-error-bg` #fef2f2 / #342535 | `--web-error-border` #fecaca / #991b1b | incumple, error, acción destructiva |

Los 8 tokens que faltaban en `tokens.css` (`--color-bg-hover`, `--color-text-disabled`, `--color-text-on-action`, `--color-border-strong`, `--color-action-text`, `--color-action-subtle`, `--color-sidebar-active-bg` y `--color-sidebar-active-text`) y el bloque del modo oscuro llegan con AV-331. `--color-text-secondary` no existe en Figma: queda como alias de `--color-text-muted` (D5) y no se usa en código nuevo.

### 3.2 Espacio (colección «AV · Dimensiones»)

| Figma | Token | Valor | Uso típico |
|---|---|---|---|
| espacio/1 | `--space-1` | 4 | entre icono y texto pequeño |
| espacio/2 | `--space-2` | 8 | entre icono y texto, dentro de un chip, entre botones |
| espacio/3 | `--space-3` | 12 | relleno vertical de celdas y campos |
| espacio/4 | `--space-4` | 16 | relleno horizontal de celdas, campos y botones; relleno de diálogos |
| espacio/6 | `--space-6` | 24 | relleno de tarjetas (Indicador), separación entre secciones |
| espacio/8 | `--space-8` | 32 | margen del contenido de la página |
| espacio/12 | `--space-12` | 48 | separación entre bloques grandes |

No hay `--space-5`: no se usa.

### 3.3 Radios

| Figma | Token | Valor | Se usa en |
|---|---|---|---|
| radio/sm | `--radius-sm` | 6 | Estado, chips, celdas de calendario |
| radio/md | `--radius-md` | 8 | Botón, Campo, Desplegable, Elemento de menú, Pestaña, celda de tabla con entrada |
| radio/lg | `--radius-lg` | 12 | Tarjeta, Indicador, Diálogo, Toast, tabla completa, panel lateral |
| radio/full | `--radius-full` | 999 | avatar, punto de estado, indicador de carga |

### 3.4 Tipografía (estilos de texto «AV/*»)

Fuente: **Geist** (D1), con Fontsource, desde AV-331. Los tokens `--type-*` con estos nombres llegan en la misma fase; los nombres antiguos (`--type-heading-*`, `--type-body-*`, `--type-label-*`) quedan como alias y no se usan en código nuevo.

| Estilo de Figma | Tamaño / línea | Peso | Token propuesto | Token actual más cercano | Uso |
|---|---|---|---|---|---|
| Título página | 24 / 32 | 600 | `--type-titulo-pagina-*` | `--type-heading-lg-*` | `h1` de cada pantalla |
| Título sección | 18 / 28 | 600 | `--type-titulo-seccion-*` | `--type-heading-md-*` (20) | `h2`, título de diálogo y de panel |
| Título tarjeta | 15 / 22 | 600 | `--type-titulo-tarjeta-*` | `--type-heading-sm-*` (16) | título dentro de una tarjeta |
| Cifra | 30 / 36 | 600 | `--type-cifra-*` | `--type-display-sm-*` | número principal de un Indicador |
| Cuerpo | 14 / 20 | 400 | `--type-cuerpo-*` | `--type-body-md-*` | texto normal, celdas |
| Cuerpo medio | 14 / 20 | 500 | `--type-cuerpo-medio-*` | `--type-label-md-*` | texto de botón, dato destacado |
| Pequeño | 13 / 18 | 400 | `--type-pequeno-*` | no existe | descripciones, texto secundario de celda |
| Pequeño medio | 13 / 18 | 500 | `--type-pequeno-medio-*` | no existe | etiquetas de menú, pestañas |
| Leyenda | 12 / 16 | 400 | `--type-leyenda-*` | `--type-body-sm-*` | ayudas, pies, metadatos |
| Etiqueta | 12 / 16 | 500 | `--type-etiqueta-*` | `--type-label-sm-*` | etiqueta de campo, texto de Estado |
| Cabecera tabla | 11 / 16, mayúsculas | 500 | `--type-cabecera-tabla-*` | no existe | cabeceras de columna |

Títulos de página y cifras llevan espaciado de letra negativo en Figma: se copia el valor de Figma en el token, no a mano.

### 3.5 Sombras

| Figma | Valor | Uso |
|---|---|---|
| AV/Sombra sm | 0 1 2, #0F172A al 6 % | tarjetas e Indicador |
| AV/Sombra lg | 0 12 32, #0F172A al 14 % | Toast, Diálogo, desplegables abiertos, panel lateral |

## 4. Catálogo de componentes

«Pendiente, fase 1» significa que todavía no existe en `components/ui`: hasta entonces, se pide a quien lleve el sistema de diseño antes de improvisar uno.

### 4.1 Básicos

| Figma | Código | Variantes y propiedades | Cuándo sí | Cuándo no |
|---|---|---|---|---|
| Botón | `Boton`, `BotonEnlace` | `variante`: `primario`, `secundario`, `fantasma`, `destructivo` (`terciario` es el nombre antiguo de `fantasma`) · `deshabilitado` (50 % de opacidad) · `icono`. En código además `compacto` y `cargando` | cualquier acción; `BotonEnlace` si navega | más de un Primario por pantalla o paso; texto genérico («Aceptar», «OK») |
| Estado | `Estado` (`Badge` es su nombre antiguo) | `tono`: `neutro`, `info`, `exito`, `aviso`, `error`, `acento` · `texto` · `punto` (por defecto) o `icono` | estado de un registro en tabla, ficha o cabecera | como botón o filtro (para eso, Pestaña u Opción) |
| Casilla | `Casilla` | `etiqueta`, `marcada`, `onCambiar`, `ayuda` · nativa de 16 px en acento | elegir varias opciones; aceptar una condición | elegir una sola opción (`GrupoOpciones`) |
| Radio compacto | `GrupoOpciones` | `fieldset` con `legend` · filas con borde, la elegida en acento · `deshabilitada` y `error` · `deshabilitado` para todo el grupo, `idBase` para ids estables que enlaza un resumen de errores, `horizontal` (en fila; apiladas en móvil) y `descritoPor` | una opción entre pocas, visibles | más de 5 opciones (Desplegable) |
| Opción | `GrupoOpciones` con `descripcion` en las opciones | tarjeta con texto y descripción · la elegida con borde de 2 px en acento | una opción entre pocas con descripción | listas largas |
| Campo | `CampoFormulario`, `AreaTexto` | 36 px · `error` · `bloqueadoMotivo` (deshabilitado) · `ayuda` debajo del control · `obligatorio` · `idErrorExterno`: marca el error y enlaza un mensaje pintado fuera (bajo una tabla de campos) | cualquier entrada de formulario, con etiqueta siempre visible | dentro de una tabla (Campo · compacto) |
| Campo · compacto | `CampoFormulario compacto`, `Selector compacto` | 32 px, texto Pequeño · `error` | filtros en barra y celdas de tabla editables | formularios completos |
| Campo · fecha | `CampoFormulario type="date"` | selector nativo del navegador con el icono atenuado · `error` | fechas sueltas o rangos «Desde / Hasta» | fecha con hora en un solo campo |
| Campo · hora | `CampoFormulario type="time"` | selector nativo del navegador · `error` · vacía y sin foco, sin el marcador gris del navegador | franjas horarias | duraciones (Campo numérico) |
| Campo numérico | `CampoFormulario formato="entero"` o `formato="decimal"` | no deja escribir ni pegar lo que no sea un número y abre el teclado numérico en el móvil · `entero`: dígitos · `decimal`: un separador (coma o punto), espacios de miles y `decimales` como máximo · `negativo` admite el signo menos · se valida igualmente al guardar | días, cantidades, RUC, importes, superficies | números con unidades o rangos en un solo campo; `type="number"` (deja escribir «e») |
| Desplegable · campo | `Selector`, `SelectorBuscable` | `select` nativo con `chevron-down` · sin valor, en gris · `bloqueadoMotivo` · `compacto` | elegir uno de un catálogo; `SelectorBuscable` si pasa de 10 | 2 o 3 opciones (`GrupoOpciones`) |
| Desplegable · opción | dentro de `SelectorBuscable` | Estado: Normal, Hover, Seleccionada, Deshabilitada | lista abierta del desplegable | fuera de un desplegable |
| Pestaña | `Pestanas` | control segmentado sobre fondo sutil · activa en blanco con Sombra sm · `contador` · `barra`: contenido a la izquierda en la misma fila (navegación del Calendario) · `derecha`: contenido a la derecha («Limpieza: al completar la ruta») · `enCaja`: marco con borde, cabecera con línea y panel sin relleno (detalle del corte, 346-1334) · `ancho="completo"`: lista a todo el ancho con las pestañas repartidas (pasos de «Programar ciclo», 372-5523) | alternar vistas o filtros de estado de una misma lista | navegar a otro módulo (menú) |
| Aviso | `AvisoEnLinea` | `tono`: `info`, `exito`, `advertencia` (Aviso), `error` · `titulo` del color del tono · `accion` | mensaje fijo en la página (plazo, bloqueo, coincidencia) | confirmar una acción ya hecha (Toast) |
| Toast | `AvisoTemporal` | `tono`: `exito` o `error` · `mensaje` y `detalle` · arriba a la derecha (360 de ancho máximo) · cierre manual o a los 6 s | confirmar que algo se guardó o falló, y desaparece | errores que el usuario tiene que corregir (Aviso o error de campo) |
| Indicador | `TarjetaIndicador` | relleno 24, radio lg, Sombra sm · etiqueta, Cifra, contexto (destacado) y `nota` (atenuada, debajo) · `alerta` con borde de error y Estado (sin barra lateral) · `sinDatos`, `cargando` · en `FilaTarjetas`, de 3 a 4 por fila y 2 en móvil | cifras clave arriba de una ficha o del panel | listas de datos (Tabla) |
| Tarjeta | `Tarjeta` | `titulo` (región con nombre), `nivel`, `descripcion`, `acciones` (a la derecha), `junto` (pegado al título, como un contador) · `relleno` `normal` (16) o `amplio` (24; 16 en móvil) · `titulo` admite texto distinto en móvil · radio lg, borde y Sombra sm | agrupar contenido en un panel: filtros, resúmenes, secciones de ficha | componer tarjetas con CSS propio en la página |
| Barra de avance | `BarraAvance` | Valor: 0 a 100 de 10 en 10 | avance de una ruta, ciclo o carga | estados sin porcentaje (Estado) |
| Estado de contenido | `EstadoVacio`, `EstadoCarga`, `EstadoError`, `EstadoSinAcceso` | tarjeta alineada a la izquierda · `EstadoVacio centrado`: sin tarjeta, centrado y con el icono en un círculo, dentro de un hueco propio (Calendario sin resultados) · título, descripción y acción de texto («Reintentar») | toda zona con datos remotos; `EstadoSinAcceso` para el 403 | errores de un campo concreto |
| Carga de archivo | `ZonaCarga` | Estado: Vacío, Adjunto, Error | adjuntar evidencias o informes | elegir ficheros ya subidos |
| Diálogo · confirmación | `DialogoConfirmacion` | `variante`: `primario` o `destructivo` · `consecuencia` · campo opcional en `children` (motivo) · «Volver» (`textoVolver`) | confirmar una acción que no se deshace fácilmente | formularios largos (panel lateral) |
| Diálogo · detalle | `DialogoDetalle` | `titulo`, `descripcion` · `lateral`: panel a la derecha con X («Historial de cambios», 367-3527) · solo lectura, con «Cerrar» · `<dialog>` nativo: Esc cierra y el foco vuelve al botón que lo abrió · a pantalla completa en móvil | ver el detalle de un dato (los registros detrás de una barra o una cifra) | editar o confirmar (Diálogo · confirmación o panel lateral) |
| Diálogo · formulario | `DialogoFormulario` | `ancho`: `estrecho` (440, un solo campo, sin línea sobre los botones), `medio` (520, también sin línea sobre los botones), `normal` (576), `amplio` (896) o `lateral` (panel de 520; en móvil, a pantalla completa: X a la izquierda del título, cuerpo sobre `--color-bg-page` y solo el botón primario, Figma 352-2324 y 391-8394) o `hoja` (hoja inferior del móvil: desde abajo, asa, sin X y los dos botones en una fila, Figma 375-6772 y 375-6817; en escritorio, como el estrecho) · `conCierre` (X también centrado) · `junto` (un `Estado` pegado al título) · `conObligatorios`, `envioDeshabilitado`, `error`, `textoCancelar` («Volver» en las acciones sobre un registro: «Iniciar CC-2026-11») · descarte con confirmación si `hayCambios` | pedir datos en un diálogo: un motivo («Registrar motivo» [373-5658](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=373-5658)) o un formulario completo | confirmar sin datos (Diálogo · confirmación) |

### 4.2 Tablas

| Figma | Código | Variantes y propiedades | Cuándo sí | Cuándo no |
|---|---|---|---|---|
| Tabla · celda | `CeldaTexto` (`tono`: `principal`, `secundario`, `deshabilitado`, `aviso`; `destacado`), `CeldaDobleLinea` (`codigo`) en el `render` de cada columna; Estado → `Estado`, Acción → `Boton` fantasma compacto, Avance → `BarraAvance`, Entrada → Campo compacto (AV-338) | los 11 tipos de Figma | cada celda de una tabla, eligiendo el tipo por el dato | maquetar contenido que no es tabular |
| Tabla · fila resaltada | `TablaDatos` con `filaResaltada` | borde fuerte alrededor de la fila | la actividad en conflicto del Calendario · Lista | marcar la fila seleccionada (usa `onFilaClick`) |
| Tabla · sin marco | `TablaDatos` con `sinMarco` | sin borde ni radio propios | dentro de otro marco, como la ruta en `Pestanas enCaja` del corte | una tabla suelta en la página (lleva su marco) |
| Tabla · columna sin título | columna con `tituloOculto` | el título solo para lectores de pantalla | la columna de acciones («Editar», «Configurar»), como en Configuración (348-1743) | ocultar el título de una columna con datos |
| Tabla · celda de cabecera | dentro de `TablaDatos` | Cabecera tabla (11 px, mayúsculas) · `ordenable` | cabecera de columna en Cabecera tabla (mayúsculas) | títulos de sección |
| Paginación | `Paginacion` (también dentro de `TablaDatos`) | «Mostrando 11 a 20 de 128» · Anterior, tres números y Siguiente · `aria-current` en la actual | listas de más de 25 filas | listas cortas |

Reglas de tabla: texto a la izquierda, cifras a la derecha. Código de registro en «Doble línea con código» y en `acento/texto` si enlaza. Sin valor: la constante `SIN_VALOR` de `utils/formato.ts`, en texto deshabilitado.

### 4.3 Navegación

| Figma | Código | Variantes | Notas |
|---|---|---|---|
| Menú lateral | `layouts/LayoutOficina/MenuLateral`, entradas en `entradasMenuLateral.ts` | **comprimido por defecto** (92 px; desplegado, 288 px); logo de la marca arriba; se despliega al pasar el cursor o con el foco del teclado dentro (un clic no lo deja abierto) y el contenido se desplaza con él; los iconos no cambian de sitio y los textos se desvanecen; el botón `panel-left`, visible al desplegarse, lo fija abierto (se recuerda en el navegador) · módulos con submódulos: chevron que gira y pliega el grupo con animación, abierto solo el del módulo activo; submódulos con línea guía en árbol (geometría de la referencia «Sidebar» de AV-358) | un solo elemento activo: prefijo más largo, módulo o subentrada |
| Elemento de menú | dentro de `MenuLateral` | Nivel: Principal, Sub · Estado: Normal, Activo (`aria-current="page"`), Deshabilitado («Próximamente») | 32 px, Pequeño; activo con `menu/activo` y `menu/texto-activo`, sin barra lateral |
| Elemento compacto | `MenuLateral comprimido` | Estado: Normal, Activo | solo el icono del módulo, con su nombre como texto accesible y `title` |
| Panel de contenido | `layouts/LayoutOficina` (`.columna`) | en escritorio, cabecera y contenido van en un panel blanco con radio lg, borde y Sombra sm, separado 8 del menú y del borde de la ventana; el menú lateral va sin borde sobre `--color-bg-page` · en móvil, sin panel | nunca una línea recta entre el menú y el contenido |
| Cabecera | `layouts/LayoutOficina/Cabecera` | 52 px · migas con `chevron-right` a la izquierda. **Pendientes:** la campana (sin servicio de notificaciones) y el tema (D6) | el título de página (h1) lo pinta `LayoutOficina` al principio del contenido, con el subtítulo opcional de `usePaginaActual` debajo; el usuario va al pie del menú lateral (`UsuarioMenu`) con `⋮`: «Cambiar contraseña» y «Cerrar sesión» |
| Barra superior móvil | `BarraSuperiorMovil` (`BarrasMoviles.tsx`) | botón «Abrir menú», título y, a la derecha, la acción de la página (`AccionMovil`, como el «+» del Calendario) · en la ficha de un registro (`usePaginaActual` con `movil`, Figma 353-2242), flecha `chevron-left` para volver a la lista en lugar del menú, el código como título y, en el contenido, el encabezado y el subtítulo cortos | por debajo de 768 px, en lugar de la Cabecera; el menú lateral se abre como panel sobre velo |
| Barra inferior y Pestaña inferior | `BarraInferior` (`BarrasMoviles.tsx`) | subentradas del módulo activo (hasta 5), icono sobre su fondo de 56 × 28 y texto · la actual con `aria-current` y el fondo de menú activo · con dos (la del capataz, 380-8204), centradas y separadas 48 | por debajo de 768 px, si el módulo tiene al menos 2 secciones |

### 4.4 Calendario y campo

| Figma | Código | Variantes | Cuándo sí |
|---|---|---|---|
| Celda de calendario | pendiente (tickets de MOD-03) | Tipo: Normal, Hoy, Fuera de mes, Seleccionado; hasta 3 eventos y «+N más» | vista mes |
| Evento de calendario | `EventoCalendario` | `tipo`: `programada` (punto hueco), `enCurso` (punto relleno), `completada` (punto verde), `favorable`, `aviso` y `prohibicion` (pastilla de todo el día) y `mas` («+N más»); `barra` para una actividad de varios días y `ajustar` para que el texto pase a varias líneas en lugar de recortarse. El Hueco de Figma es solo layout | dentro de una celda o de la vista lista |
| Chip de actividad | pendiente (tickets de MOD-03) | Estado: Programada, En curso, Completada, Prohibida | actividad en leyendas y listas |
| Día del selector | pendiente (tickets de MOD-03) | Tipo: Normal, Vacío, Aviso, Prohibido, Seleccionado | selector de fechas al programar |
| Día de la semana | pendiente (tickets de MOD-03) | Activo: Sí, No | repetición semanal (L M X J V S D) |
| Fila de checklist | `FilaChecklist` | Estado: Pendiente, Marcado, Sin sincronizar · toda la fila es un botón | marcar jardines de una ruta en campo («Ruta de hoy» del capataz, [353-2335](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=353-2335)) |

### 4.5 Iconos

Lucide, 16 px, trazo heredando el color del texto (45 iconos en la página del sistema). `Icono` usa `lucide-react` (D3) con **los mismos nombres que en Figma**: `<Icono nombre="calendar" tamano="base" />`. Los 45 iconos de la página de Figma están disponibles; los nombres antiguos (`aspa`, `triangulo`…) siguen como alias y no se usan en código nuevo. Un icono nuevo se añade primero en Figma y después en `Icono.tsx`. Un icono nunca va solo si la acción no es obvia: lleva texto o `aria-label`.

## 5. Patrones de pantalla

| Patrón | Cómo se compone | Referencia en Figma |
|---|---|---|
| **Página de listado** | Cabecera con migas. Título página a la izquierda y un Botón primario a la derecha (en código, con `AccionesPagina`). Aviso opcional. Pestañas con contador para filtrar por estado. Tabla dentro de un panel con `radio/lg`. Paginación debajo si hay más de 25 filas. | «Incidencias · bandeja» [388-7027](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=388-7027), «Ciclos» [346-1032](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=346-1032) |
| **Página de detalle** | Migas con el listado y el código («Ciclos > CC-2026-11»). Título con el nombre y el código, y el Estado pegado a él (en código, `JuntoTitulo`); debajo, una línea de contexto (`usePaginaActual` con subtítulo). Acciones a la derecha (`AccionesPagina`: Secundario y Primario). Indicadores en una fila y, debajo, pestañas o paneles (historial). | «Detalle de ciclo sin ruta» [380-7171](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=380-7171) |
| **Formulario en panel lateral** | Panel a la derecha sobre la pantalla atenuada, con Título sección y cierre arriba. Campos en una o dos columnas, Avisos en línea y botones abajo a la derecha (Secundario «Cancelar» y Primario con verbo). En código, `DialogoFormulario` con `ancho="lateral"`: 520 de ancho (a pantalla completa en móvil), X de cierre y línea bajo la cabecera, y `envioDeshabilitado` para el primario si hay errores a la vista o nada cambia; entra desde la derecha y sale hacia ella en 200 ms (`--duracion-panel`), con el velo en fundido; con «reducir movimiento», sin animación (`AnimacionDialogo.module.css` y `useCierreAnimado`, comunes a todos los diálogos). **Pendiente:** el panel lateral aún no es componente en Figma. | «Nueva restricción» [364-2570](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=364-2570) |
| **Diálogo de confirmación** | Diálogo · confirmación centrado sobre velo. Título con el objeto («Cancelar CC-2026-11»), una línea de consecuencia y un campo opcional (motivo). Botones: «Volver» (Secundario) y la acción (Destructivo si no se deshace). Movimiento común a todos los diálogos centrados (confirmación, detalle y formulario): entran y salen con un fundido y un ligero zoom en 150 ms (`--duracion-transicion`), con el velo en fundido; con «reducir movimiento», sin animación (`AnimacionDialogo.module.css` y `useCierreAnimado`). | «Cancelar ciclo» [370-4167](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=370-4167) |
| **Estados de contenido** | Estado de contenido dentro del panel que tendría los datos, nunca a pantalla completa: Cargando (tras 300 ms), Vacío con acción si la hay, Error con «Reintentar» y Sin acceso para el 403. | «Calendario · sin resultados» [374-6421](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=374-6421), «Acceso denegado» [374-7925](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=374-7925) |
| **Calendario** | Barra con mes, flechas y «Hoy». Rejilla de Celdas de calendario (máximo 3 eventos y «+N más»). Leyenda de actividades y restricciones al pie. Vistas Mes, Semana y Lista con Pestañas. **Pendiente:** la vista semana no es componente todavía. | «Calendario con capas» [344-436](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=344-436), «Calendario · Semana» [361-2252](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=361-2252) |
| **Móvil** | Barra superior móvil con título y acción. Contenido en una columna. Barra inferior con 2 a 5 Pestañas inferiores. En móvil, el h1 va en la barra superior. La tira semanal del Calendario es de la página (`VistaMovil`, con `Boton` fantasma). Formularios cortos en una hoja inferior (`DialogoFormulario` con `ancho="hoja"`). | «Móvil · Calendario» [352-2192](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=352-2192), «Móvil · Programar ciclo» [352-2324](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=352-2324) |
| **Modo oscuro** | Las mismas pantallas cambiando el modo de la colección «AV · Color». Decidido (D6): antes del 18/11 solo se preparan los tokens, sin selector visible; se prueba con `data-tema="oscuro"` en `<html>`. | «Calendario · oscuro y menú comprimido» [347-1492](https://www.figma.com/design/KXRcYHPgVOkPZskPCFPoQj/?node-id=347-1492) |

## 6. Sí / No

Reglas que salen de la revisión del profesor del 29/10.

| Sí | No |
|---|---|
| Controles con `radio/md`, contenedores con `radio/lg` y estados con `radio/sm` | radios distintos para la misma pieza (hasta 7 en un módulo) |
| Texto como mínimo a `--space-3` del borde de su caja; tarjetas con `--space-4` o `--space-6` | texto pegado al borde de una caja o una tarjeta |
| Todos los botones con `Boton` y sus cuatro tipos | botones con CSS propio, cuadrados en una pantalla y redondeados en otra |
| Un solo elemento activo en el menú, marcado con fondo y texto | dos módulos marcados a la vez; barra vertical de acento |
| Un Botón primario por pantalla o paso | dos acciones primarias compitiendo, o el mismo botón duplicado |
| Estado con texto visible (y punto si hace falta) | estado comunicado solo con color |
| Fechas como «05 nov. 2026» con `utils/formato.ts` | formatos de fecha distintos según la pantalla |
| Toda zona con datos muestra carga, vacío, error y sin acceso | pantallas en blanco mientras carga o tras un 403 |

## 7. Cómo añadir o cambiar un componente

**Lo vigila el CI** (`comprobar-estilos.sh`, AV-351). En todo `src/`: ninguna medida en px (salvo bordes de 1 y 2 px y `@media`) y `font-size` y `border-radius` solo con `var(--type-*)` y `var(--radius-*)`. En las carpetas migradas, que hoy son todas salvo planificación: nada de primitivos de color, ninguna `var(--x)` sin definir y ningún control crudo fuera de `components/ui` y `layouts`. Un dato interactivo que no encaja en un componente (una barra de gráfico, una celda de mapa de calor, una ficha pulsable, la barra de herramientas de un lienzo) lleva el comentario `// Excepción al sistema (AV-351): motivo` en su fichero. Planificación entra en las dos reglas cuando la sustituya el rediseño de MOD-03.

1. **Primero en Figma**, en la página del sistema de diseño, con sus variantes y las variables de «AV · Color» y «AV · Dimensiones». Lo revisa quien lleve diseño.
2. **Después en `src/components/ui`**: mismo nombre (sin tildes, en PascalCase), mismas variantes, solo tokens, y su prueba.
3. Se actualiza la fila del componente en este documento en el mismo PR.
4. **Nunca al revés sin avisar a diseño.** Si una urgencia obliga a tocar el código antes, se abre una incidencia para llevarlo a Figma y se enlaza en el PR.
5. Una variante para una sola pantalla no es motivo para crear un componente: o entra en el sistema para todos, o la pantalla usa lo que hay.

## 8. Decisiones

| Decisión | Estado |
|---|---|
| D1. Fuente Geist en lugar de Inter | decidido: Geist (AV-331) |
| D3. Iconos `lucide-react` en lugar de `Icono` | decidido: `lucide-react` (AV-340) |
| D5. Qué hacer con `--color-text-secondary` | decidido: alias de `--color-text-muted` |
| D6. Modo oscuro visible para usuarios | decidido: antes del 18/11 solo tokens |
| AV-272. Aprobación del sistema de diseño y la propuesta de MOD-03 | aprobado |
