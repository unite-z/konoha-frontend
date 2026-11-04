/**
 * Pestaña «Series de restricciones» de Configuración (AV-268): las series con fechas de hoy en adelante, con su
 * nivel, fechas, horario y alcance. El jefe da de baja una serie entera (`DELETE restricciones/{id}/?serie=true`).
 * El aviso de duplicado y los ciclos afectados del panel «Nueva restricción» llegan con AV-257.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import { CeldaDobleLinea } from '@/components/ui/CeldasTabla'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { darDeBajaRestriccion } from '@/services/api/planificacion'
import { textoHorario } from '@/utils/planificacion'
import { EFECTO_RESTRICCION, periodoRestriccion } from '../resumen/resumenPlanificacion'
import { textoAlcance, type SerieRestriccion } from './series'

export interface SeriesRestriccionesProps {
  series: SerieRestriccion[]
  cargando: boolean
  puedeEditar: boolean
  onBaja: (serie: SerieRestriccion) => void
}

export default function SeriesRestricciones({ series, cargando, puedeEditar, onBaja }: SeriesRestriccionesProps) {
  const [dandoDeBaja, setDandoDeBaja] = useState<SerieRestriccion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar(serie: SerieRestriccion) {
    setEnviando(true)
    setError(null)
    try {
      await darDeBajaRestriccion(serie.idBaja, true)
      setDandoDeBaja(null)
      onBaja(serie)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const columnas: ColumnaTabla<SerieRestriccion>[] = [
    { clave: 'tipo', titulo: 'Restricción', multilinea: true, render: (s) => <CeldaDobleLinea principal={s.tipo} detalle={s.descripcion ?? undefined} /> },
    {
      clave: 'nivel',
      titulo: 'Nivel',
      render: (s) => {
        const efecto = EFECTO_RESTRICCION[s.efecto]
        return <Estado tono={efecto.tono} texto={efecto.texto} />
      },
    },
    { clave: 'fechas', titulo: 'Fechas', multilinea: true, render: (s) => <CeldaDobleLinea principal={periodoRestriccion(s.primera, s.ultima)} detalle={s.fechas === 1 ? '1 fecha' : `${s.fechas} fechas`} /> },
    { clave: 'horario', titulo: 'Horario', render: (s) => (s.hora_inicio || s.hora_fin ? textoHorario(s.hora_inicio, s.hora_fin) : 'Todo el día') },
    { clave: 'alcance', titulo: 'Alcance', render: (s) => textoAlcance(s.area_verde_id) },
  ]
  if (puedeEditar) {
    columnas.push({
      clave: 'acciones',
      titulo: 'Acciones',
      render: (s) => (
        <Boton variante="fantasma" compacto onClick={() => setDandoDeBaja(s)}>
          <span aria-hidden="true">Dar de baja</span>
          <span className="sr-only">{`Dar de baja la serie ${s.tipo}`}</span>
        </Boton>
      ),
    })
  }

  return (
    <>
      <TablaDatos
        titulo="Series de restricciones"
        columnas={columnas}
        filas={series}
        claveFila={(s) => s.serie}
        estado={cargando ? 'cargando' : 'exito'}
        vacio={{ titulo: 'No hay series de restricciones', descripcion: 'Las restricciones creadas con repetición aparecerán aquí.' }}
      />
      {dandoDeBaja && (
        <DialogoConfirmacion
          abierto
          titulo={`Dar de baja ${dandoDeBaja.tipo}`}
          consecuencia={`Se da de baja toda la serie: ${dandoDeBaja.fechas === 1 ? 'su fecha próxima deja' : `sus ${dandoDeBaja.fechas} fechas próximas dejan`} de aparecer en el calendario.`}
          textoConfirmar="Dar de baja la serie"
          variante="destructivo"
          cargando={enviando}
          onConfirmar={() => void confirmar(dandoDeBaja)}
          onCancelar={() => {
            setDandoDeBaja(null)
            setError(null)
          }}
        >
          {error && (
            <AvisoEnLinea tono="error" titulo="No se pudo dar de baja">
              {error}
            </AvisoEnLinea>
          )}
        </DialogoConfirmacion>
      )}
    </>
  )
}
