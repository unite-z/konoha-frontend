#!/usr/bin/env python3
"""Genera public/datos/campus-3d.json a partir de las fuentes de datos/. Sin red y reproducible.

Uso: python3 scripts/campus-3d/generar.py [--medir]
Con --medir imprime la distancia de Hausdorff dirigida (fuente -> resultado) por capa.
"""
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
DATOS = AQUI / "datos"
SALIDA = RAIZ / "public" / "datos" / "campus-3d.json"
AREAS = RAIZ / "public" / "datos" / "areas-verdes.geojson"
ATRIBUCION = "© OpenStreetMap contributors · OpenFreeMap"
VIAS = {"primary", "secondary", "tertiary", "minor", "service"}


def cargar(ruta):
    return json.loads(Path(ruta).read_text(encoding="utf-8"))


fuentes = cargar(DATOS / "fuentes.json")
ofm = cargar(DATOS / "ofm-campus.json")
osm = cargar(DATOS / "osm-edificios.json")
flora = cargar(DATOS / "flora.json")
areas = cargar(AREAS)["features"]
perimetro = [(g["lon"], g["lat"]) for g in cargar(DATOS / "campus.json")["elements"][0]["geometry"]][:-1]


def centro(P):
    return (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))


# Proyección equirrectangular local: origen en el centro del perímetro (se publica en el JSON).
_c = centro(perimetro)
ORIGEN_LON = round(_c[0], 7)
ORIGEN_LAT = round(_c[1], 7)
KX = round(math.cos(math.radians(ORIGEN_LAT)) * 111320, 2)
KY = 110540.0


def m(c):
    return ((c[0] - ORIGEN_LON) * KX, (c[1] - ORIGEN_LAT) * KY)


CAMP = [m(c) for c in perimetro]


def dentro(p, poly):
    x, y = p
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def area2(P):
    return sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P))) / 2


def simplificar(P, eps):
    """Douglas-Peucker."""
    if len(P) < 3:
        return P
    a, b = P[0], P[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    long = math.hypot(dx, dy)
    if long < 1e-9:
        return P
    i, dm = 0, 0
    for k in range(1, len(P) - 1):
        d = abs(dy * P[k][0] - dx * P[k][1] + b[0] * a[1] - b[1] * a[0]) / long
        if d > dm:
            i, dm = k, d
    return simplificar(P[: i + 1], eps)[:-1] + simplificar(P[i:], eps) if dm > eps else [a, b]


def dist_segmento(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


medidas = {}


def L(P, eps=0.3, capa=None, cerrado=True):
    """Simplifica, redondea a 0,1 m y devuelve la lista plana x,y,x,y; registra el error de la capa."""
    Q = [(round(x, 1), round(y, 1)) for x, y in simplificar(P, eps)]
    if capa:
        trazo = Q + [Q[0]] if cerrado else Q
        peor = max(min(dist_segmento(p, trazo[i], trazo[i + 1]) for i in range(len(trazo) - 1)) for p in P)
        medidas[capa] = max(medidas.get(capa, 0), peor)
    return [v for p in Q for v in p]


def anillos(g):
    if g["g"] == "Polygon":
        return [g["c"]]
    return g["c"] if g["g"] == "MultiPolygon" else []


def lineas(g):
    if g["g"] == "LineString":
        return [g["c"]]
    return g["c"] if g["g"] == "MultiLineString" else []


def numero(v):
    try:
        return float(str(v).lower().replace("m", "").strip())
    except ValueError:
        return None


salida = {
    "atribucion": ATRIBUCION,
    "proyeccion": {"tipo": "equirrectangular-local", "origen_lon": ORIGEN_LON, "origen_lat": ORIGEN_LAT, "kx": KX, "ky": KY, "unidad": "m"},
    "fuentes": {"areas_copia": fuentes["areas"]["copia"], "ofm": fuentes["ofm"]["obtenidas"], "osm": fuentes["osm"]["obtenidas"]},
    "campus": L(CAMP, 0.5, "perimetro"),
    "edificios": [], "cesped": [], "canchas": [], "agua": [], "vias": [], "senderos": [],
    "areas": [], "arboles": [], "etiquetas": [],
}

# Alturas de la tesela (para los edificios de OSM sin altura propia).
tesela = []
for f in ofm:
    if f["k"] == "building":
        for r in anillos({"g": f["g"], "c": f["c"]}):
            tesela.append(([m(c) for c in r[0]][:-1], float(f["h"] or 5), float(f["b"] or 0)))

for e in osm:
    P = [m(c) for c in e["g"]][:-1]
    if len(P) < 3 or not dentro(centro(P), CAMP):
        continue
    t = e["t"]
    h = numero(t.get("height"))
    if h is None and numero(t.get("building:levels")) is not None:
        h = numero(t["building:levels"]) * 3
    c, base = centro(P), 0.0
    for Q, hq, bq in tesela:
        if dentro(c, Q):
            base = bq if bq < (h or hq) else 0.0
            h = h if h is not None else hq
            break
    salida["edificios"].append({"p": L(P, 0.3, "edificios"), "h": round(h if h is not None else 5.0, 1), "b": round(base, 1)})
    if t.get("name") and abs(area2(P)) > 700:
        x, y = c
        salida["etiquetas"].append([t["name"], round(x, 1), round(y, 1)])

for f in ofm:
    k, cl = f["k"], f["cl"]
    if k in ("landcover", "park") and cl in ("grass", "wood", "scrub", "park", "garden"):
        destino = salida["cesped"]
    elif k == "landuse" and cl in ("pitch", "playground", "track"):
        destino = salida["canchas"]
    elif k == "water" and cl in ("lake", "pond", "swimming_pool"):
        destino = salida["agua"]
    elif k == "transportation":
        for Ls in lineas({"g": f["g"], "c": f["c"]}):
            tramo = []
            capa = "vias" if cl in VIAS else "senderos"
            for c in Ls + [None]:
                q = m(c) if c else None
                if q and dentro(q, CAMP):
                    tramo.append(q)
                    continue
                if len(tramo) > 1:
                    salida[capa].append(L(tramo, 0.5, capa, cerrado=False))
                tramo = []
        continue
    else:
        continue
    for r in anillos({"g": f["g"], "c": f["c"]}):
        P = [m(c) for c in r[0]][:-1]
        if len(P) < 3:
            continue
        if k == "landcover" or k == "park":
            ok = sum(dentro(q, CAMP) for q in P) >= 0.9 * len(P)
        else:
            ok = dentro(centro(P), CAMP)
        if ok:
            destino.append(L(P, 0.5, "cesped" if destino is salida["cesped"] else "canchas" if destino is salida["canchas"] else "agua"))

acum = {}
primeras = {}
for f in areas:
    pr = f["properties"]
    ident = pr.get("mapa_id")
    for poly in f["geometry"]["coordinates"]:
        P = [m(c) for c in poly[0][:-1]]
        if len(P) < 3:
            continue
        entrada = {"id": ident, "n": pr.get("Nombre"), "c": pr.get("código"), "s": round(pr.get("Área") or 0)}
        entrada["r"] = pr.get("Riego act")
        entrada["p"] = L(P, 0.3, "areas")
        salida["areas"].append(entrada)
        primeras.setdefault(ident, entrada)
        a = abs(area2(P))
        cx, cy = centro(P)
        t = acum.setdefault(ident, [0.0, 0.0, 0.0])
        t[0] += cx * a
        t[1] += cy * a
        t[2] += a
    huella = hashlib.sha1(json.dumps(f["geometry"]["coordinates"], separators=(",", ":")).encode()).hexdigest()[:8]
    primeras[ident]["h"] = huella
for ident, (sx, sy, sa) in acum.items():
    primeras[ident]["ct"] = [round(sx / sa, 1), round(sy / sa, 1)]

for lon, lat, alto, fuste, radio in flora:
    q = m((lon, lat))
    if dentro(q, CAMP):
        salida["arboles"].append([round(q[0], 1), round(q[1], 1), round(alto, 1), round(fuste, 1), round(radio, 1)])

texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + "\n"
SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(texto, encoding="utf-8")
print({k: len(v) for k, v in salida.items() if isinstance(v, (list, dict))}, "bytes", len(texto.encode()), "gzip", len(gzip.compress(texto.encode(), mtime=0)))
if "--medir" in sys.argv:
    print("Hausdorff dirigido fuente->resultado (m):", {k: round(v, 3) for k, v in sorted(medidas.items())})
