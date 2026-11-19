/**
 * Pestaña «Series de restricciones» de Configuración (AV-268, Figma 366-3687): las restricciones de hoy en adelante,
 * una fila por serie o por restricción suelta, con el nombre y el tipo, el nivel, las fechas («Cada jueves · hasta
 * 31/12») y el alcance («Ruidosos · todo el campus»). El jefe da de baja una serie entera
 * (`DELETE restricciones/{id}/?serie=true`) o una restricción suelta.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AccionFila from '@/design-system/AccionFila'
import { CeldaDobleLinea, CeldaTexto } from '@/components/ui/CeldasTabla'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { darDeBajaRestriccion } from '@/services/api/planificacion'
import { EFECTO_RESTRICCION } from '../resumen/resumenPlanificacion'
import { textoAlcance, textoFechasSerie, type SerieRestriccion } from './series'

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
      await darDeBajaRestriccion(serie.idBaja, serie.serie !== null)
      setDandoDeBaja(null)
      onBaja(serie)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const columnas: ColumnaTabla<SerieRestriccion>[] = [
    {
      clave: 'restriccion',
      titulo: 'Restricción',
      multilinea: true,
      render: (s) =>
        s.descripcion ? (
          <CeldaDobleLinea principal={s.descripcion} detalle={s.tipo} />
        ) : (
          <CeldaTexto texto={s.tipo} destacado />
        ),
    },
    {
      clave: 'nivel',
      titulo: 'Nivel',
      render: (s) => {
        const efecto = EFECTO_RESTRICCION[s.efecto]
        return <Estado tono={efecto.tono} texto={efecto.texto} />
      },
    },
    { clave: 'fechas', titulo: 'Fechas', render: (s) => textoFechasSerie(s) },
    { clave: 'alcance', titulo: 'Alcance', render: (s) => <CeldaTexto texto={textoAlcance(s)} tono="secundario" /> },
  ]
  if (puedeEditar) {
    columnas.push({
      clave: 'acciones',
      titulo: 'Acciones',
      tituloOculto: true,
      render: (s) => (
        <AccionFila
          icono="circle-x"
          nombre="Dar de baja"
          etiqueta={`Dar de baja ${s.descripcion ?? s.tipo}`}
          tono="peligro"
          onClick={() => setDandoDeBaja(s)}
        />
      ),
    })
  }

  return (
    <>
      <TablaDatos
        titulo="Series de restricciones"
        columnas={columnas}
        filas={series}
        claveFila={(s) => s.clave}
        estado={cargando ? 'cargando' : 'exito'}
        vacio={{
          titulo: 'No hay restricciones próximas',
          descripcion: 'Las restricciones de hoy en adelante aparecerán aquí.',
        }}
      />
      {dandoDeBaja && (
        <DialogoConfirmacion
          abierto
          titulo={`Dar de baja ${dandoDeBaja.descripcion ?? dandoDeBaja.tipo}`}
          consecuencia={
            dandoDeBaja.serie
              ? `Se da de baja toda la serie: ${dandoDeBaja.fechas === 1 ? 'su fecha próxima deja' : `sus ${dandoDeBaja.fechas} fechas próximas dejan`} de aparecer en el calendario.`
              : 'Deja de aparecer en el calendario. Queda en el historial.'
          }
          textoConfirmar={dandoDeBaja.serie ? 'Dar de baja la serie' : 'Dar de baja'}
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
