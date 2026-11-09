export interface UsoFuenteMapa {
  uso_fuente: string
  tipo_uso_id: number | null
  tipo_uso_nombre: string | null
}

export interface PoligonoMapaAsignado {
  id_fuente: string
  area_verde_id: number | null
  area_verde_nombre: string | null
  area_verde_tipo_uso_id: number | null
  area_verde_tipo_uso_nombre: string | null
  superficie_registrada_m2: string | null
  area_verde_activa: boolean | null
}
