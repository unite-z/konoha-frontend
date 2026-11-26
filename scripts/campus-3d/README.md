# Datos del campus 3D (AV-421, RD-06)

Genera `public/datos/campus-3d.json`: la geometría del campus PUCP en metros locales para el mapa 3D (Three.js). Se hace una vez y sin red; el visor solo lee el JSON (no lo importa el bundle principal, se pide al entrar en las vistas de mapa).

## Regenerar

```sh
python3 scripts/campus-3d/generar.py          # escribe public/datos/campus-3d.json
python3 scripts/campus-3d/generar.py --medir  # además imprime la distancia de Hausdorff por capa
```

Solo usa la biblioteca estándar de Python 3 y las fuentes de `datos/` y `public/datos/areas-verdes.geojson`. Dos ejecuciones seguidas dan el mismo fichero byte a byte.

Cuándo regenerar: cuando cambie `public/datos/areas-verdes.geojson` (compara los `h` del JSON con los de la copia nueva), cuando se refresquen las fuentes de OSM u OpenFreeMap, o cuando cambie la flora. Después sube también `fuentes.json` con las fechas nuevas.

## De dónde sale cada capa

| Capa del JSON | Fuente | Fichero |
|---|---|---|
| `campus` (perímetro) | OpenStreetMap, `amenity=university` | `datos/campus.json` |
| `edificios` (`p`, `h`, `b`) | Huellas de OSM; altura de OSM (`height`, o `building:levels` x 3) y, si falta, la de la tesela; si tampoco hay, 5 m | `datos/osm-edificios.json`, `datos/ofm-campus.json` |
| `etiquetas` | Nombre de los edificios de OSM de más de 700 m2 | `datos/osm-edificios.json` |
| `areas` (`id`, `n`, `c`, `s`, `r`, `p`; `ct` y `h` en la primera entrada de cada `id`) | GeoJSON de Konoha (521 áreas) | `public/datos/areas-verdes.geojson` |
| `cesped`, `canchas`, `agua`, `vias`, `senderos` | Teselas z14 de OpenFreeMap | `datos/ofm-campus.json` |
| `arboles` `[x, y, alto, fuste, radio]` | Flora del proyecto 3D (1.197 ejemplares); decorativa, sin ID de ejemplar | `datos/flora.json` |

`ct` es el centro del área (ponderado por superficie) y `h` un hash SHA-1 corto de su geometría original; ambos van solo en la primera entrada de cada `mapa_id` (un área puede tener varios polígonos), así no se repiten los 521 identificadores en bloques aparte. Compara `h` para ver qué áreas cambiaron. `fuentes` guarda la fecha de la copia de las áreas. El campo `agua` queda vacío si el campus no tiene láminas de agua en las teselas.

## Proyección

Equirrectangular local: `x = (lon - origen_lon) * kx` (este), `y = (lat - origen_lat) * ky` (norte), en metros. El origen es el centro del perímetro. Los parámetros van en el bloque `proyeccion` del JSON, y el visor los usa para colocar lon/lat (GPS, GeoJSON) en la escena.

## Por qué las fuentes son compactas

Las teselas `.pbf` originales no se conservan en el proyecto 3D, solo su decodificación (`ofm.geojson`, 3,7 MB, con todo el mapa de la zona y los puntos de interés). `preparar-fuentes.py` la reduce a lo que usa el generador: solo las capas edificio, cobertura, uso de suelo, transporte y agua, dentro de la caja envolvente del perímetro más 0,0005° (se conserva todo elemento con algún vértice dentro), con coordenadas a 6 decimales (0,1 m). Resultado: `ofm-campus.json` de 0,8 MB (0,17 MB con gzip). Regenerar el JSON desde ellas da el mismo resultado que desde las originales. `decodificar.mjs` (teselas a GeoJSON) no se trae: necesita red y dependencias que el repo no tiene; vive en `mapas-3d-pucp/isometrico/`.

## Fidelidad (distancia de Hausdorff dirigida fuente a resultado, en metros)

Medida con `generar.py --medir` el 26/11/2026. Es el error de simplificar (Douglas-Peucker) y redondear a 0,1 m cada contorno. Se mide sobre las fuentes de `datos/`, que ya van redondeadas a 6 decimales (hasta 0,08 m), y solo en el sentido fuente a resultado; en el sentido contrario el error es de 0,07 m como mucho. Con ambos redondeos el perímetro (0,42) sigue bajo 0,5.

| Capa | Máximo | Límite |
|---|---|---|
| Edificios | 0,31 | 0,5 |
| Perímetro | 0,42 | 0,5 |
| Áreas | 0,40 | 0,5 |
| Césped | 0,49 | 1,5 |
| Canchas | 0,07 | 1,5 |
| Vías | 0,07 | 1,5 |
| Senderos | 0,49 | 1,5 |

Pendiente: la captura comparativa que pide el ticket se añade cuando el visor (RD-07) pinte el JSON. El visor de referencia `mapas-3d-pucp/isometrico/visor3d/index.html` no lee el formato nuevo sin adaptar (`ct`, `h` y `areas` van unidos).

## Tamaño

`campus-3d.json`: unos 224 KB sin comprimir y 71 KB con gzip (el límite es 260 KB; el objetivo del ticket eran unos 65 KB). Se bajó del 84 KB inicial metiendo centro y huella dentro de cada área en vez de repetir sus 521 identificadores en dos bloques aparte. Bajar más exigiría subir la tolerancia de simplificación y perder fidelidad.

## Licencias

- Datos de OpenStreetMap: © OpenStreetMap contributors, licencia ODbL 1.0.
- Teselas de OpenFreeMap: datos de OpenStreetMap (ODbL) con el esquema OpenMapTiles (CC-BY 4.0). Atribución obligatoria: «© OpenStreetMap contributors · OpenFreeMap». Va en el JSON (`atribucion`) y el visor debe mostrarla.
- Áreas verdes y flora: datos propios de Konoha/PUCP.
