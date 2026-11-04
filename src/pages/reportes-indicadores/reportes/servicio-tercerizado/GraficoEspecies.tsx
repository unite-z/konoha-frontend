/**
 * Pestaña «Especies y plagas» del reporte por servicio (RF-REP-008): las 10 primeras en barras (por atenciones) y
 * la tabla completa. Al elegir una barra, «Ver detalles» abre las atenciones en las que se atendió.
 */
import { useState } from 'react'
import BarrasHorizontales from '../../../../components/reportes-indicadores/graficos/BarrasHorizontales'
import { escalaRedonda, marcasEje } from '../../../../components/reportes-indicadores/graficos/escala'
import { BarraSeleccion, CabeceraGrafico } from '../../../../components/reportes-indicadores/graficos/PartesGrafico'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '../../../../components/ui/TablaDatos'
import type { ElementoAtendido, EspeciesPlagasServicio, FilaAtencionServicio } from '../../../../types/reportesGestion'
import { formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import { atencionesDeElemento } from '../../../../utils/reporteServicio'
import estilos from './ServicioTercerizado.module.css'
import Tarjeta from '../../../../components/ui/Tarjeta'

const BARRAS_VISIBLES = 10

const COLUMNAS: ColumnaTabla<ElementoAtendido>[] = [
  { clave: 'tipo', titulo: 'Tipo', ordenable: true },
  { clave: 'nombre', titulo: 'Nombre', ordenable: true },
  { clave: 'atenciones', titulo: 'Atenciones', alineacion: 'derecha', ordenable: true, render: (e) => formatearNumero(e.atenciones) },
  { clave: 'ejemplares', titulo: 'Ejemplares', alineacion: 'derecha', ordenable: true, render: (e) => formatearNumero(e.ejemplares) },
]

export interface GraficoEspeciesProps {
  especies: EspeciesPlagasServicio
  filas: FilaAtencionServicio[]
  onVerDetalle: (titulo: string, filas: FilaAtencionServicio[]) => void
}

export default function GraficoEspecies({ especies, filas, onVerDetalle }: GraficoEspeciesProps) {
  const [elegida, setElegida] = useState<string | null>(null)
  if (especies.sin_datos) {
    return <EstadoVacio nivel={3} titulo="Especies y plagas sin datos" descripcion={especies.mensaje_sin_datos ?? undefined} />
  }
  const primeras = [...especies.elementos].sort((a, b) => b.atenciones - a.atenciones).slice(0, BARRAS_VISIBLES)
  const escala = escalaRedonda(Math.max(0, ...primeras.map((e) => e.atenciones)), { enteros: true })

  return (
    <div className={estilos.columna}>
      <Tarjeta etiqueta="Especies y plagas más atendidas">
        <CabeceraGrafico
          titulo={especies.elementos.length > BARRAS_VISIBLES ? `Las ${BARRAS_VISIBLES} más atendidas` : 'Atenciones por especie o plaga'}
          total={formatearNumero(especies.elementos.length)}
        />
        <BarraSeleccion
          seleccionado={elegida}
          indicacion="Haz clic en una barra para ver sus atenciones."
          onVerDetalle={() => elegida && onVerDetalle(`Atenciones: ${elegida}`, atencionesDeElemento(filas, elegida))}
        />
        <BarrasHorizontales
          barras={primeras.map((e) => ({ clave: e.nombre, texto: `${e.nombre} (${e.tipo.toLowerCase()})`, valor: e.atenciones, esTipo: false }))}
          agrupadas={false}
          formatear={(v) => (v === null ? SIN_VALOR : `${formatearNumero(v)} ${v === 1 ? 'atención' : 'atenciones'}`)}
          escala={escala}
          marcas={marcasEje(escala, formatearNumero)}
          claveElegida={elegida}
          onAlternar={(clave) => setElegida((actual) => (actual === clave ? null : clave))}
        />
      </Tarjeta>
      <TablaDatos
        titulo="Especies y plagas atendidas"
        columnas={COLUMNAS}
        filas={especies.elementos}
        claveFila={(e) => `${e.tipo}|${e.nombre}`}
        ordenInicial={{ clave: 'atenciones', direccion: 'desc' }}
      />
    </div>
  )
}
