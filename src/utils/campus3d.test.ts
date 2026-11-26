import { describe, expect, it } from "vitest";
import crudo from "../../public/datos/campus-3d.json?raw";

interface Proyeccion {
  tipo: string;
  origen_lon: number;
  origen_lat: number;
  kx: number;
  ky: number;
  unidad: string;
}

interface AreaCampus {
  id: string;
  n: string | null;
  c: string | null;
  s: number;
  r: string | null;
  p: number[];
}

interface Edificio {
  p: number[];
  h: number;
  b: number;
}

interface DatosCampus3d {
  atribucion: string;
  proyeccion: Proyeccion;
  campus: number[];
  edificios: Edificio[];
  cesped: number[][];
  canchas: number[][];
  agua: number[][];
  vias: number[][];
  senderos: number[][];
  areas: AreaCampus[];
  centros: Record<string, [number, number]>;
  huellas: Record<string, string>;
  arboles: number[][];
  etiquetas: [string, number, number][];
}

const datos = JSON.parse(crudo) as DatosCampus3d;
const GEOJSON_AREAS = import.meta.glob("../../public/datos/areas-verdes.geojson", { query: "?raw", import: "default", eager: true });

function aMetros(py: Proyeccion, lon: number, lat: number): [number, number] {
  return [(lon - py.origen_lon) * py.kx, (lat - py.origen_lat) * py.ky];
}

function aLonLat(py: Proyeccion, x: number, y: number): [number, number] {
  return [x / py.kx + py.origen_lon, y / py.ky + py.origen_lat];
}

function distanciaM(py: Proyeccion, a: [number, number], b: [number, number]): number {
  return Math.hypot((a[0] - b[0]) * py.kx, (a[1] - b[1]) * py.ky);
}

describe("campus-3d.json", () => {
  it("tiene todas las claves del contrato", () => {
    for (const clave of ["atribucion", "proyeccion", "campus", "edificios", "cesped", "canchas", "agua", "vias", "senderos", "areas", "centros", "huellas", "arboles", "etiquetas"]) {
      expect(datos).toHaveProperty(clave);
    }
    expect(datos.atribucion).toBe("© OpenStreetMap contributors · OpenFreeMap");
  });

  it("trae las capas con datos", () => {
    expect(datos.areas.length).toBeGreaterThan(500);
    expect(datos.arboles.length).toBeGreaterThan(1000);
    expect(datos.edificios.length).toBeGreaterThan(50);
    expect(datos.campus.length).toBeGreaterThan(8);
    expect(datos.vias.length).toBeGreaterThan(0);
    expect(datos.senderos.length).toBeGreaterThan(0);
    for (const e of datos.edificios) {
      expect(e.h).toBeGreaterThan(e.b);
      expect(e.p.length % 2).toBe(0);
    }
  });

  it("cada área tiene identificador, centro y huella", () => {
    for (const a of datos.areas) {
      expect(a.id).toBeTruthy();
      expect(datos.centros[a.id]).toHaveLength(2);
      expect(datos.huellas[a.id]).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("publica una proyección completa", () => {
    const py = datos.proyeccion;
    expect(py.unidad).toBe("m");
    expect(py.kx).toBeGreaterThan(100000);
    expect(py.ky).toBeGreaterThan(100000);
    expect(py.origen_lat).toBeLessThan(-12);
    expect(py.origen_lon).toBeLessThan(-77);
  });

  it("la ida y vuelta lon/lat a metros y de vuelta da menos de 0,5 m en 5 puntos", () => {
    const py = datos.proyeccion;
    const puntos: [number, number][] = [
      [py.origen_lon, py.origen_lat],
      [-77.0806, -12.0692],
      [-77.0786, -12.0672],
      [-77.0826, -12.0712],
      [-77.0775, -12.0705],
    ];
    for (const [lon, lat] of puntos) {
      const [x, y] = aMetros(py, lon, lat);
      const vuelta = aLonLat(py, x, y);
      expect(distanciaM(py, [lon, lat], vuelta)).toBeLessThan(0.5);
    }
  });

  it("proyectar el primer vértice de 5 áreas del GeoJSON cae sobre su contorno publicado", () => {
    const py = datos.proyeccion;
    const geo = JSON.parse(Object.values(GEOJSON_AREAS)[0] as string) as {
      features: { properties: { mapa_id: string }; geometry: { coordinates: number[][][][] } }[];
    };
    for (const f of geo.features.slice(0, 5)) {
      const [lon, lat] = f.geometry.coordinates[0][0][0];
      const [x, y] = aMetros(py, lon, lat);
      const p = datos.areas.find((a) => a.id === f.properties.mapa_id)?.p ?? [];
      let minimo = Infinity;
      for (let i = 0; i < p.length; i += 2) minimo = Math.min(minimo, Math.hypot(p[i] - x, p[i + 1] - y));
      expect(minimo).toBeLessThan(0.5);
    }
  });
});
