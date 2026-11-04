/**
 * Pestañas del detalle del corte (AV-270, Figma 346-1334 y 371-4306): Ruta, Interrupciones y Limpieza, en caja.
 * - Ruta: cortados por día y por cortar, y la tabla de jardines con su estado y quién y cuándo lo marcó.
 * - Interrupciones: cada traslado con su hora, zonas, motivo y minutos descontados.
 * - Limpieza (371-4576, 371-4838 y 371-5092): con la ruta incompleta, «Faltan 17 jardines por cortar» y
 *   «Registrar jornada» deshabilitado; con la ruta completa, las jornadas, el total frente a 3 + 1 («Cumple» o
 *   «No cumple», RN-002) y «Registrar jornada» (`POST ciclos/{id}/limpiezas/`, AV-262).
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import BarraAvance from '@/components/ui/BarraAvance'
import { CeldaTexto } from '@/components/ui/CeldasTabla'
import Estado from '@/components/ui/Estado'
import Icono from '@/components/ui/Icono'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import type { FechaIso } from '@/types/comun'
import { registrarLimpieza } from '@/services/api/corte'
import type { CicloCorte, InterrupcionCorte, JardinRuta, LimpiezaCorte } from '@/types/corte'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { avanceRuta, cortadosPorDia, fechaCompleta, momento, porCortar, textoMarcado, totalLimpieza } from './corte'
import estilos from './Ciclos.module.css'

const VISIBLES_POR_CORTAR = 3

export interface PestanasCorteProps {
  ciclo: Programacion
  corte: CicloCorte
  servicio: ServicioPeriodico | undefined
  hoy: FechaIso
  /** `AAAA-MM-DDTHH:mm` de Lima. */
  ahora: string
}

export default function PestanasCorte({ ciclo, corte, servicio, hoy, ahora }: PestanasCorteProps) {
  const [pestana, setPestana] = useState('ruta')
  const [limpiezas, setLimpiezas] = useState<LimpiezaCorte[]>(corte.limpiezas)
  const [registrando, setRegistrando] = useState(false)
  const [errorLimpieza, setErrorLimpieza] = useState<string | null>(null)
  const total = totalLimpieza({ ...corte, limpiezas }, servicio)

  async function registrarJornada() {
    setRegistrando(true)
    setErrorLimpieza(null)
    try {
      const nueva = await registrarLimpieza(ciclo.id, hoy)
      setLimpiezas((previas) => [...previas, nueva])
    } catch (causa) {
      setErrorLimpieza(causa instanceof Error ? causa.message : 'Inténtalo de nuevo.')
    } finally {
      setRegistrando(false)
    }
  }
  const avance = avanceRuta(corte.jardines)
  const completa = avance.total > 0 && avance.cortados === avance.total
  const pendientes = porCortar(corte.jardines)
  const inicio = ciclo.fecha_inicio_real
  const dias = inicio ? cortadosPorDia(corte.jardines, inicio, ciclo.fecha_fin_real ?? hoy) : []
  const maximoDia = Math.max(1, ...dias.map((d) => d.cortados))

  const columnasRuta: ColumnaTabla<JardinRuta>[] = [
    { clave: 'zona', titulo: 'Zona', render: (j) => <CeldaTexto texto={j.zona} tono="secundario" /> },
    { clave: 'jardin', titulo: 'Jardín', multilinea: true, render: (j) => <CeldaTexto texto={`${j.codigo} · ${j.nombre}`} destacado /> },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (j) => <Estado tono={j.estado === 'Cortado' ? 'exito' : 'neutro'} texto={j.estado} />,
    },
    { clave: 'marcado', titulo: 'Marcado', render: (j) => <CeldaTexto texto={textoMarcado(j, ahora)} tono="secundario" /> },
  ]
  const columnasInterrupciones: ColumnaTabla<InterrupcionCorte>[] = [
    { clave: 'hora', titulo: 'Hora', render: (i) => momento(i.hora, ahora) },
    { clave: 'zonas', titulo: 'Traslado', render: (i) => `${i.zona_afectada} → ${i.zona_alternativa ?? 'sin zona libre'}` },
    { clave: 'motivo', titulo: 'Motivo', multilinea: true, render: (i) => <CeldaTexto texto={i.motivo} tono="secundario" /> },
    { clave: 'descontado', titulo: 'Descontado', alineacion: 'derecha', render: (i) => `${i.minutos_descontados} min` },
  ]

  return (
    <Pestanas
      etiqueta="Ciclo de corte"
      enCaja
      valor={pestana}
      onCambiar={setPestana}
      pestanas={[
        { valor: 'ruta', texto: 'Ruta', contador: avance.total },
        { valor: 'interrupciones', texto: 'Interrupciones', contador: corte.interrupciones.length },
        { valor: 'limpieza', texto: 'Limpieza' },
      ]}
      derecha={
        completa || pestana !== 'ruta' ? undefined : (
          <>
            <Icono nombre="info" tamano="base" />
            Limpieza: al completar la ruta
          </>
        )
      }
    >
      {pestana === 'ruta' && (
        <>
          {dias.length > 0 && (
            <div className={estilos.avanceCorte}>
              <section aria-labelledby="cortados-por-dia" className={estilos.columnaCorte}>
                <h3 id="cortados-por-dia" className={estilos.rotuloCorte}>
                  Cortados por día
                </h3>
                <ul className={estilos.dias}>
                  {dias.map((dia) => (
                    <li key={dia.fecha} className={estilos.dia}>
                      <span className={estilos.detalleEvento}>{dia.texto}</span>
                      <BarraAvance valor={dia.cortados} maximo={maximoDia} etiqueta={`Cortados el ${dia.texto}`} textoValor={String(dia.cortados)} />
                      <span className={estilos.cifraDia}>{dia.cortados}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="por-cortar" className={estilos.columnaCorte}>
                <h3 id="por-cortar" className={estilos.rotuloCorte}>
                  Por cortar <Estado tono="neutro" texto={String(pendientes.length)} punto={false} />
                </h3>
                <ul className={estilos.historial}>
                  {pendientes.slice(0, VISIBLES_POR_CORTAR).map((jardin) => (
                    <li key={jardin.id} className={`${estilos.evento} ${estilos.jardinPendiente}`}>
                      <span>
                        {jardin.codigo} · {jardin.nombre}
                      </span>
                      <span className={estilos.detalleEvento}>{jardin.zona}</span>
                    </li>
                  ))}
                </ul>
                {pendientes.length > VISIBLES_POR_CORTAR && <p className={estilos.masPorCortar}>+{pendientes.length - VISIBLES_POR_CORTAR} más</p>}
              </section>
            </div>
          )}
          <TablaDatos titulo="Ruta de jardines" sinMarco compacta columnas={columnasRuta} filas={corte.jardines} claveFila={(j) => String(j.id)} />
        </>
      )}
      {pestana === 'interrupciones' && (
        <TablaDatos
          titulo="Interrupciones"
          sinMarco
          compacta
          columnas={columnasInterrupciones}
          filas={corte.interrupciones}
          claveFila={(i) => String(i.id)}
          estado={corte.interrupciones.length === 0 ? 'vacio' : 'exito'}
          vacio={{ titulo: 'Sin interrupciones', descripcion: 'Las interrupciones por molestia aparecerán aquí.', nivel: 3 }}
        />
      )}
      {pestana === 'limpieza' && (
        <div className={estilos.panelLimpieza}>
          {!completa ? (
            <>
              <AvisoEnLinea tono="advertencia" titulo={`Faltan ${pendientes.length} ${pendientes.length === 1 ? 'jardín' : 'jardines'} por cortar`}>
                La limpieza se registra con la ruta completa.
              </AvisoEnLinea>
              <ul className={estilos.listaSimple}>
                {pendientes.slice(0, VISIBLES_POR_CORTAR).map((jardin) => (
                  <li key={jardin.id}>
                    {jardin.codigo} · {jardin.nombre}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <ul className={estilos.historial}>
                {limpiezas.map((limpieza) => (
                  <li key={limpieza.id} className={estilos.evento}>
                    <span>Jornada de limpieza · {fechaCompleta(limpieza.fecha)}</span>
                    <span className={estilos.detalleEvento}>{limpieza.autor}</span>
                  </li>
                ))}
              </ul>
              {limpiezas.length > 0 && (
                <div className={`${estilos.totalLimpieza} ${total.cumple ? estilos.cumple : estilos.noCumple}`}>
                  <span>{total.texto}</span>
                  <Estado tono={total.cumple ? 'exito' : 'error'} texto={total.cumple ? 'Cumple' : 'No cumple'} />
                </div>
              )}
            </>
          )}
          {errorLimpieza && (
            <AvisoEnLinea tono="error" titulo="No se pudo registrar la jornada">
              {errorLimpieza}
            </AvisoEnLinea>
          )}
          <div>
            <Boton variante="secundario" deshabilitado={!completa} cargando={registrando} onClick={() => void registrarJornada()}>
              Registrar jornada
            </Boton>
          </div>
        </div>
      )}
    </Pestanas>
  )
}
