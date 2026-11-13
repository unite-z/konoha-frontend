// RF-PLA-004 y CU-007 · Ciclos (AV-269, Figma «Ciclos» 346-1032)
// Columna de acciones por estado (AV-400, petición de Marcos: no está en Figma): reprogramar, iniciar, cancelar o
// finalizar sin entrar al detalle, con los mismos diálogos que la ficha.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import BarraAvance from '@/components/ui/BarraAvance'
import { BotonEnlace } from '@/components/ui/Boton'
import AccionFila, { AccionesFila } from '@/design-system/AccionFila'
import { CeldaDobleLinea, CeldaTexto } from '@/components/ui/CeldasTabla'
import Estado from '@/components/ui/Estado'
import EstadoError from '@/components/ui/EstadoError'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION, rutaCiclo } from '@/router/rutasApp'
import { listarProgramaciones, listarServiciosPeriodicos, type CambioEstadoCiclo } from '@/services/api/planificacion'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { Programacion } from '@/types/planificacion'
import { SIN_VALOR } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import PanelProgramarCiclo from '../calendario/PanelProgramarCiclo'
import { ESTADO_PROGRAMACION, fechaCorta } from '../resumen/resumenPlanificacion'
import estilos from './Ciclos.module.css'
import { esCorte } from './corte'
import DialogoCambioCiclo from './DialogoCambioCiclo'
import {
  PESTANAS_CICLOS,
  avanceCiclo,
  avisoDeEstado,
  ciclosDePestana,
  contadoresCiclos,
  fechasCiclo,
  ordenarCiclos,
  rangoCiclos,
  type PestanaCiclos,
} from './ciclos'

export default function CiclosPage() {
  usePaginaActual('Ciclos', [MIGAS_PLANIFICACION.planificacion, { texto: 'Ciclos' }])
  const navegar = useNavigate()
  const hoy = hoyLima()
  const puedeEditar = puedeEditarPlanificacion(usePermisos())
  const [pestana, setPestana] = useState<PestanaCiclos>('todos')
  // «Ciclo programado · alerta atendida» (Figma 373-5779): el aviso llega del panel «Programar ciclo».
  const { state } = useLocation()
  const [aviso, setAviso] = useState(() => avisoDeEstado(state))
  const { desde, hasta } = rangoCiclos(hoy)
  const consulta = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))
  const [cambio, setCambio] = useState<{ ciclo: Programacion; cambio: CambioEstadoCiclo } | null>(null)
  const [reprogramando, setReprogramando] = useState<Programacion | null>(null)
  // Los servicios solo hacen falta para el panel de reprogramar.
  const servicios = useConsulta(reprogramando ? 'ciclos-servicios' : null, (signal) =>
    listarServiciosPeriodicos(signal),
  )

  /** Acciones de la fila según el estado; el corte en curso se cierra en su ficha (ruta y limpieza, regla 3 + 1). */
  function acciones(c: Programacion) {
    const nombre = c.codigo ?? c.servicio
    if (c.estado === 'Programada') {
      return (
        <AccionesFila>
          <AccionFila
            icono="calendar"
            nombre="Reprogramar"
            etiqueta={`Reprogramar ${nombre}`}
            onClick={() => setReprogramando(c)}
          />
          <AccionFila
            icono="check"
            nombre="Iniciar ciclo"
            etiqueta={`Iniciar ${nombre}`}
            onClick={() => setCambio({ ciclo: c, cambio: 'inicio' })}
          />
          <AccionFila
            icono="circle-x"
            tono="peligro"
            nombre="Cancelar ciclo"
            etiqueta={`Cancelar ${nombre}`}
            onClick={() => setCambio({ ciclo: c, cambio: 'cancelacion' })}
          />
        </AccionesFila>
      )
    }
    if (c.estado === 'EnCurso' && !esCorte(c.servicio)) {
      return (
        <AccionesFila>
          <AccionFila
            icono="circle-check"
            nombre="Finalizar ciclo"
            etiqueta={`Finalizar ${nombre}`}
            onClick={() => setCambio({ ciclo: c, cambio: 'fin' })}
          />
        </AccionesFila>
      )
    }
    return null
  }

  const columnas: ColumnaTabla<Programacion>[] = [
    {
      clave: 'ciclo',
      titulo: 'Ciclo',
      multilinea: true,
      // Con el código de AV-364, «Corte de césped / CC-2026-11»; sin él, solo el servicio.
      render: (c) => (c.codigo ? <CeldaDobleLinea principal={c.servicio} detalle={c.codigo} codigo /> : c.servicio),
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      multilinea: true,
      render: (c) => <CeldaTexto texto={c.proveedor ?? 'Personal propio'} tono="secundario" />,
    },
    { clave: 'fechas', titulo: 'Fechas', render: (c) => fechasCiclo(c.fecha_inicio_prevista, c.fecha_fin_prevista) },
    {
      clave: 'avance',
      titulo: 'Avance',
      render: (c) => {
        const avance = avanceCiclo(c, hoy)
        if (avance === null) return SIN_VALOR
        return (
          <span className={estilos.avance}>
            <BarraAvance valor={avance} maximo={100} etiqueta={`Avance de ${c.servicio}`} textoValor={`${avance} %`} />
            <span className={estilos.porcentaje} aria-hidden="true">
              {avance} %
            </span>
          </span>
        )
      },
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (c) => {
        const estado = ESTADO_PROGRAMACION[c.estado]
        // Como en Figma, «En curso» va relleno y sin punto.
        return <Estado tono={estado.tono} texto={estado.texto} punto={c.estado !== 'EnCurso'} />
      },
    },
    ...(puedeEditar
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            tituloOculto: true,
            alineacion: 'derecha' as const,
            render: acciones,
          },
        ]
      : []),
  ]

  if (consulta.estado === 'error' && !consulta.datos) {
    return (
      <EstadoError
        titulo="No pudimos cargar los ciclos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }

  const ciclos = ordenarCiclos(consulta.datos ?? [])
  const contadores = contadoresCiclos(ciclos)
  const filas = ciclosDePestana(ciclos, pestana)

  return (
    <>
      {puedeEditar && (
        <AccionesPagina>
          <BotonEnlace to={`${RUTAS_PLANIFICACION.calendario}?programar=`} variante="primario" icono="plus-circle">
            Programar ciclo
          </BotonEnlace>
        </AccionesPagina>
      )}
      <Pestanas
        etiqueta="Estado de los ciclos"
        pestanas={PESTANAS_CICLOS.map((p) => ({ ...p, contador: contadores[p.valor] }))}
        valor={pestana}
        onCambiar={(valor) => setPestana(valor as PestanaCiclos)}
      >
        <TablaDatos
          titulo="Ciclos"
          columnas={columnas}
          filas={filas}
          claveFila={(c) => String(c.id)}
          onFilaClick={(c) => void navegar(rutaCiclo(c.id))}
          estado={!consulta.datos ? 'cargando' : 'exito'}
          vacio={{ titulo: 'Sin ciclos en esta pestaña', descripcion: 'Los ciclos que se programen aparecerán aquí.' }}
        />
      </Pestanas>
      {cambio && (
        <DialogoCambioCiclo
          ciclo={cambio.ciclo}
          cambio={cambio.cambio}
          hoy={hoy}
          onCerrar={() => setCambio(null)}
          onCambiado={(_actualizado, mensaje) => {
            setCambio(null)
            setAviso({ mensaje })
            consulta.reintentar()
          }}
        />
      )}
      {reprogramando && servicios.datos && (
        <PanelProgramarCiclo
          servicios={servicios.datos}
          servicioInicial={null}
          reprogramar={reprogramando}
          onCerrar={() => setReprogramando(null)}
          onProgramada={(nueva) => {
            setReprogramando(null)
            setAviso({
              mensaje: `Ciclo reprogramado del ${fechaCorta(nueva.fecha_inicio_prevista)} al ${fechaCorta(nueva.fecha_fin_prevista)}.`,
            })
            consulta.reintentar()
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso?.mensaje ?? null} detalle={aviso?.detalle} onCerrar={() => setAviso(null)} />
    </>
  )
}
