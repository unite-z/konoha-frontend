#!/usr/bin/env python3
"""Reduce las fuentes en bruto del proyecto 3D a las compactas de datos/. Solo se usa al refrescar fuentes.

Uso: python3 preparar-fuentes.py <carpeta-bruta> <carpeta-datos>
La carpeta bruta contiene: ofm.geojson, campus.json, pucp.json y flora.geojson.
"""
import json
import sys
from pathlib import Path

bruta, destino = Path(sys.argv[1]), Path(sys.argv[2])
MARGEN = 0.0005  # grados, unos 55 m alrededor del perímetro
CAPAS = {"building", "landcover", "landuse", "transportation", "water"}


def r6(c):
    return [round(c[0], 6), round(c[1], 6)]


def redondear(g):
    if isinstance(g[0], (int, float)):
        return r6(g)
    return [redondear(x) for x in g]


def vertices(g):
    if isinstance(g[0], (int, float)):
        yield g
    else:
        for x in g:
            yield from vertices(x)


def guardar(nombre, dato):
    (destino / nombre).write_text(json.dumps(dato, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


campus = json.loads((bruta / "campus.json").read_text())
via = [e for e in campus["elements"] if e["type"] == "way"][0]
guardar("campus.json", {"elements": [{"type": "way", "id": via["id"], "geometry": [{"lon": round(g["lon"], 6), "lat": round(g["lat"], 6)} for g in via["geometry"]]}]})
lons = [g["lon"] for g in via["geometry"]]
lats = [g["lat"] for g in via["geometry"]]
caja = (min(lons) - MARGEN, min(lats) - MARGEN, max(lons) + MARGEN, max(lats) + MARGEN)


def dentro(g):
    return any(caja[0] <= x <= caja[2] and caja[1] <= y <= caja[3] for x, y in vertices(g))


ofm = []
for f in json.loads((bruta / "ofm.geojson").read_text())["features"]:
    p = f["properties"]
    if p["_capa"] in CAPAS and dentro(f["geometry"]["coordinates"]):
        ofm.append({"g": f["geometry"]["type"], "c": redondear(f["geometry"]["coordinates"]),
                    "k": p["_capa"], "cl": p.get("class", ""), "h": p.get("render_height"), "b": p.get("render_min_height")})
guardar("ofm-campus.json", ofm)

edificios = []
for e in json.loads((bruta / "pucp.json").read_text())["elements"]:
    t = e.get("tags", {})
    if "building" in t and "geometry" in e and dentro([[g["lon"], g["lat"]] for g in e["geometry"]]):
        edificios.append({"id": e["id"], "t": {k: t[k] for k in ("name", "height", "building:levels") if k in t},
                          "g": [r6([g["lon"], g["lat"]]) for g in e["geometry"]]})
guardar("osm-edificios.json", edificios)

flora = []
for f in json.loads((bruta / "flora.geojson").read_text())["features"]:
    pr = f["properties"]
    flora.append(r6(f["geometry"]["coordinates"]) + [float(pr.get("alto") or 5), float(pr.get("fuste") or 2), float(pr.get("radio") or 2)])
guardar("flora.json", flora)
