/**
 * Bloque de un sector de RF-REP-006: cabecera con capataz, cifras y reparto por modalidad, y tabla de sus
 * espacios (atenciones frente al más atendido del sector, modalidad y tipos).
 * HU-MOD06-014: el grupo «Sin sector» se identifica y se explica.
 */
import Badge from '../../../../components/ui/Badge'
import TablaDatos, { type ColumnaTabla } from '../../../../components/ui/TablaDatos'
import { SIN_SECTOR, type EspacioAtenciones, type SectorAtenciones } from '../../../../types/reportes'
import { formatearNumero } from '../../../../utils/formato'
import estilos from './Atenciones.module.css'
import { AtencionesFrenteAlMaximo, BarraModalidad, TiposAtencion } from './PiezasAtenciones'

/** Texto del grupo sin sector (el mismo que la opción del filtro). */
const TEXTO_SIN_SECTOR = 'Sin sector'

function columnas(maximo: number): ColumnaTabla<EspacioAtenciones>[] {
  return [
    { clave: 'area_verde_nombre', titulo: 'Espacio', ordenable: true },
    {
      clave: 'total',
      titulo: 'Atenciones',
      subtitulo: 'frente al más atendido',
      ordenable: true,
      render: (e) => <AtencionesFrenteAlMaximo total={e.total} maximo={maximo} nombre={e.area_verde_nombre ?? ''} />,
    },
    {
      clave: 'modalidad',
      titulo: 'Modalidad',
      subtitulo: 'propio · tercerizado',
      ordenable: true,
      valorOrden: (e) => e.personal_propio,
      render: (e) => <BarraModalidad propio={e.personal_propio} tercerizado={e.tercerizado} />,
    },
    { clave: 'por_tipo', titulo: 'Por tipo', multilinea: true, render: (e) => <TiposAtencion porTipo={e.por_tipo} /> },
  ]
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className={estilos.etiquetaCifra}>{etiqueta}</dt>
      <dd className={`${estilos.valorCifra} cifra`}>{formatearNumero(valor)}</dd>
    </div>
  )
}

export default function BloqueSector({ sector }: { sector: SectorAtenciones }) {
  const esSinSector = sector.sector_id === null
  const nombre = sector.sector_nombre ?? TEXTO_SIN_SECTOR
  const idTitulo = `sector-${sector.sector_id ?? SIN_SECTOR}`
  const maximo = Math.max(0, ...sector.espacios.map((e) => e.total))
  return (
    <section className={estilos.sector} aria-labelledby={idTitulo}>
      <div className={estilos.cabeceraSector}>
        <div className={estilos.identidad}>
          <div className={estilos.tituloLinea}>
            <h2 id={idTitulo} className={estilos.tituloSector}>
              {nombre}
            </h2>
            {sector.atencion_a_demanda && <Badge tono="neutral" texto="Atención a demanda" />}
          </div>
          {sector.capataz_vigente?.nombre && <p className={estilos.ayuda}>Capataz: {sector.capataz_vigente.nombre}</p>}
          {esSinSector && <p className={estilos.ayuda}>Espacios sin sector asignado; se atienden a demanda</p>}
        </div>
        <dl className={estilos.cifras}>
          <Cifra etiqueta="Atenciones" valor={sector.total} />
          <Cifra etiqueta="Personal propio" valor={sector.personal_propio} />
          <Cifra etiqueta="Tercerizado" valor={sector.tercerizado} />
          <Cifra etiqueta="Espacios" valor={sector.espacios.length} />
        </dl>
      </div>
      <BarraModalidad propio={sector.personal_propio} tercerizado={sector.tercerizado} formato="porcentaje" />
      <TablaDatos
        titulo={`Espacios de ${nombre}`}
        columnas={columnas(maximo)}
        filas={sector.espacios}
        claveFila={(e) => String(e.area_verde_id)}
      />
    </section>
  )
}
