// RF-SER-002 a 006 · Atenciones registradas con un contrato (ficha del contrato)
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeRegistrarAtencion } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import { RUTAS_TERCERIZADOS, rutaDetalleAtencion } from '@/router/rutasApp'
import { listarAtenciones } from '@/services/api/tercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import type { Atencion } from '@/types/tercerizados'
import { codigoCorto, insigniaEstado, resumenAlcances, textoOrigen } from '@/utils/estadosTercerizados'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import type { EstadoContratoElegido } from '../nueva/NuevaAtencionPage'
import { POR_PAGINA } from './filtrosMaestros'
import estilos from './Maestros.module.css'

// El contrato ya está en el título de la ficha: su columna sobra aquí.
const COLUMNAS: ColumnaTabla<Atencion>[] = [
  { clave: 'codigo', titulo: 'Código', render: (a) => <span className={estilos.cifra}>{codigoCorto(a.codigo)}</span> },
  { clave: 'descripcion', titulo: 'Descripción', multilinea: true, render: (a) => a.descripcion },
  {
    clave: 'origen',
    titulo: 'Origen',
    multilinea: true,
    render: (a) => (
      <>
        {textoOrigen(a.origen)}
        {a.unidad_solicitante_nombre && (
          <>
            <br />
            <span className={estilos.ayuda}>{a.unidad_solicitante_nombre}</span>
          </>
        )}
      </>
    ),
  },
  { clave: 'alcances', titulo: 'Alcance', multilinea: true, render: (a) => resumenAlcances(a.alcances) },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (a) => (
      <span className={estilos.enLinea}>
        <Estado {...insigniaAEstado(insigniaEstado(a.estado))} />
        {a.es_riesgo && <Estado tono="aviso" texto="Riesgo" />}
      </span>
    ),
  },
  { clave: 'registro', titulo: 'Registrada', render: (a) => formatearFecha(a.fecha_creacion) },
]

export interface AtencionesDelContratoProps {
  contrato: ContratoMaestro
}

export default function AtencionesDelContrato({ contrato }: AtencionesDelContratoProps) {
  const navegar = useNavigate()
  const permisos = usePermisos()
  const [pagina, setPagina] = useState(1)
  const consulta = useConsulta(
    `atenciones-contrato|${contrato.id}|${pagina}`,
    (signal) => listarAtenciones({ contrato_id: contrato.id }, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const total = consulta.datos?.count ?? 0
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  return (
    <section className={estilos.seccion} aria-labelledby="titulo-atenciones-contrato">
      <div className={estilos.cabeceraSeccion}>
        <h2 id="titulo-atenciones-contrato" className={estilos.tituloSeccion}>
          Atenciones registradas
        </h2>
        <div className={estilos.enLinea}>
          {(consulta.estado === 'exito' || consulta.estado === 'vacio') && (
            <span className={estilos.ayuda}>
              {formatearNumero(total)} {total === 1 ? 'atención' : 'atenciones'}
            </span>
          )}
          {contrato.vigente && puedeRegistrarAtencion(permisos) && (
            <BotonEnlace
              to={RUTAS_TERCERIZADOS.nuevaAtencion}
              variante="primario"
              state={{ contrato } satisfies EstadoContratoElegido}
            >
              Registrar atención
            </BotonEnlace>
          )}
        </div>
      </div>
      <TablaDatos
        titulo="Atenciones del contrato"
        columnas={COLUMNAS}
        filas={consulta.datos?.results ?? []}
        claveFila={(a) => String(a.id)}
        estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
        onFilaClick={(a) => navegar(rutaDetalleAtencion(a.id))}
        paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: setPagina }}
        vacio={{
          titulo: 'Este contrato aún no tiene atenciones',
          descripcion: 'Aparecerán aquí cuando el jefe de sección registre la primera.',
        }}
        error={{
          titulo: 'No pudimos cargar las atenciones',
          descripcion: consulta.error?.detalle ?? '',
          onReintentar: consulta.reintentar,
        }}
      />
    </section>
  )
}
