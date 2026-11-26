/**
 * Panel del contrato (RD-49): resumen con avance y verificación, y sus atenciones con el enlace al informe del
 * servicio en Reportes. «Editar» (solo jefatura) pasa el mismo panel a modo edición. Sin RD-16 el avance se calcula
 * al abrir el contrato con sus atenciones.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import BarraAvance from '@/design-system/BarraAvance'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import ListaDescripcion from '@/design-system/ListaDescripcion'
import Paginacion from '@/design-system/Paginacion'
import { insigniaAEstado } from '@/design-system/tonos'
import { puedeRegistrarAtencion } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import type { EstadoContratoElegido } from '@/pages/servicios-tercerizados/nueva/NuevaAtencionPage'
import { RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { obtenerContrato } from '@/services/api/maestrosTercerizados'
import { listarAtenciones, listarTodo } from '@/services/api/tercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { Atencion } from '@/types/tercerizados'
import { codigoCorto, insigniaEstado, textoOrigen } from '@/utils/estadosTercerizados'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { textoMonto } from '@/utils/validacionMaestros'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { estiloTransicion, panel } from '@/rediseno/base/movimiento'
import { rutaAtencion } from '../enlaces'
import { rutaReportes } from '@/rediseno/reportes/enlaces'
import { avanceDeAtenciones, avanceDelContrato, enCurso, type Avance, type ContratoConAvance } from './avance'
import { POR_PAGINA } from './filtros'
import { nombreAvance } from './nombres'
import estilos from './Contratos.module.css'

/** Clave del informe «Servicio tercerizado» en Reportes (RD-61). `rutaReportes()` aún no admite el informe. */
const INFORME_SERVICIO = 'servicio-tercerizado'

export interface PanelContratoProps {
  id: number
  onCerrar: () => void
  onEditar: () => void
  verMontos: boolean
  puedeEditar: boolean
}

function ResumenAvance({ avance, id }: { avance: Avance; id: number }) {
  return (
    <div className={estilos.resumenAvance} style={estiloTransicion(nombreAvance(id))} /* estilo-calculado */>
      <p className={`${estilos.cifraGrande} cifra`}>
        {formatearNumero(avance.conformes)} de {formatearNumero(avance.total)} atenciones conformes
      </p>
      <BarraAvance
        valor={avance.conformes}
        maximo={avance.total}
        etiqueta="Avance del contrato"
        textoValor={`${avance.conformes} de ${avance.total} atenciones conformes`}
      />
      <ul className={estilos.verificacion} aria-label="Verificación de las atenciones">
        <li>
          <Estado tono="exito" texto={`${avance.conformes} conformes`} />
        </li>
        <li>
          <Estado tono="aviso" texto={`${avance.observadas} observadas`} />
        </li>
        <li>
          <Estado tono="info" texto={`${avance.pendientes} por verificar`} />
        </li>
        <li>
          <Estado tono="neutro" texto={`${enCurso(avance)} sin informe`} />
        </li>
      </ul>
    </div>
  )
}

function Atenciones({ atenciones }: { atenciones: Atencion[] }) {
  if (atenciones.length === 0) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="Este contrato aún no tiene atenciones"
        descripcion="Aparecerán aquí cuando se registre la primera."
      />
    )
  }
  return (
    <ul className={estilos.atenciones} aria-label="Atenciones del contrato">
      {atenciones.map((a) => (
        <li key={a.id} className={estilos.atencion}>
          <Link to={rutaAtencion(a.id)} className={estilos.enlaceAtencion}>
            <span className={`${estilos.numero} cifra`}>{codigoCorto(a.codigo)}</span>
            <span>{a.descripcion}</span>
            <span className={estilos.secundario}>
              {textoOrigen(a.origen)}
              {a.unidad_solicitante_nombre ? ` · ${a.unidad_solicitante_nombre}` : ''} · Registrada el{' '}
              {formatearFecha(a.fecha_creacion)}
            </span>
          </Link>
          <span className={estilos.estadoAtencion}>
            <Estado {...insigniaAEstado(insigniaEstado(a.estado))} />
            {a.es_riesgo && <Estado tono="aviso" texto="Riesgo" />}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PanelContrato({ id, onCerrar, onEditar, verMontos, puedeEditar }: PanelContratoProps) {
  const permisos = usePermisos()
  const [pagina, setPagina] = useState(1)
  const consulta = useConsulta(`rd49-contrato|${id}`, (signal) => obtenerContrato(id, signal))
  const contrato = consulta.datos as ContratoConAvance | null
  const avanceServidor = contrato ? avanceDelContrato(contrato) : null
  // Sin los campos de RD-16 en la respuesta, el avance se calcula con todas las atenciones del contrato.
  const calculo = useConsulta(contrato && !avanceServidor ? `rd49-avance|${id}` : null, (signal) =>
    listarTodo((numero) => listarAtenciones({ contrato_id: id }, numero, signal)),
  )
  const atenciones = useConsulta(
    `rd49-atenciones|${id}|${pagina}`,
    (signal) => listarAtenciones({ contrato_id: id }, pagina, signal),
    (datos) => datos.results.length === 0,
  )
  const calculado = calculo.datos?.completo ? avanceDeAtenciones(calculo.datos.resultados) : null
  const avance = avanceServidor ?? calculado

  let cuerpo
  if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    cuerpo = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver este contrato"
        descripcion="Tu cuenta no tiene permiso para consultarlo."
      />
    )
  } else if (consulta.estado === 'error' && consulta.error?.estado === 404) {
    cuerpo = (
      <EstadoVacio nivel={3} titulo="No existe este contrato" descripcion="Revisa el enlace o búscalo en la lista." />
    )
  } else if (consulta.estado === 'error' && !contrato) {
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el contrato"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!contrato) {
    cuerpo = <EstadoCarga forma="pagina" texto="Cargando el contrato…" />
  } else {
    const total = atenciones.datos?.count ?? 0
    let listaAtenciones
    if (atenciones.estado === 'error' && atenciones.error?.estado === 403) {
      listaAtenciones = (
        <EstadoSinAcceso
          nivel={3}
          titulo="No puedes ver las atenciones"
          descripcion="Tu cuenta no tiene permiso para consultar las atenciones de este contrato."
        />
      )
    } else if (atenciones.estado === 'error') {
      listaAtenciones = (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar las atenciones"
          descripcion={atenciones.error?.detalle ?? ''}
          onReintentar={atenciones.reintentar}
        />
      )
    } else if (atenciones.estado === 'vacio') {
      listaAtenciones = <Atenciones atenciones={[]} />
    } else if (atenciones.datos) {
      listaAtenciones = (
        <>
          <Atenciones atenciones={atenciones.datos.results} />
          <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={total} onCambiar={setPagina} />
        </>
      )
    } else {
      listaAtenciones = <EstadoCarga forma="tabla" filas={3} />
    }

    const pestanaAtenciones = (
      <>
        <div className={estilos.cabeceraAtenciones}>
          <p className={`${estilos.secundario} cifra`} aria-live="polite">
            {atenciones.estado === 'exito' || atenciones.estado === 'vacio'
              ? `${formatearNumero(total)} ${total === 1 ? 'atención registrada' : 'atenciones registradas'}`
              : ''}
          </p>
          {/* Hasta RD-52 el alta de la atención es la pantalla actual, ya con este contrato elegido. */}
          {contrato.vigente && puedeRegistrarAtencion(permisos) && (
            <BotonEnlace
              to={RUTAS_TERCERIZADOS.nuevaAtencion}
              state={{ contrato } satisfies EstadoContratoElegido}
              variante="primario"
              icono="plus"
            >
              Registrar atención
            </BotonEnlace>
          )}
        </div>
        {listaAtenciones}
        <BotonEnlace to={`${rutaReportes()}?informe=${INFORME_SERVICIO}`} variante="secundario">
          Ver el informe del servicio en Reportes
        </BotonEnlace>
      </>
    )

    cuerpo = (
      <PanelLateral
        abierto
        onCerrar={onCerrar}
        titulo={contrato.numero}
        subtitulo={
          contrato.vigente ? (
            <Estado tono="exito" texto="Vigente" />
          ) : (
            <Estado
              tono="aviso"
              texto="Vencido · histórico"
              ayuda="Se conserva como histórico: no se puede usar en nuevas atenciones"
            />
          )
        }
        viewTransitionName={panel(id)}
        pie={
          puedeEditar ? (
            <Boton variante="secundario" icono="pencil" onClick={onEditar}>
              Editar contrato
            </Boton>
          ) : undefined
        }
        pestanas={[
          {
            valor: 'resumen',
            texto: 'Resumen',
            contenido: (
              <div className={estilos.contenidoPanel}>
                {avance ? (
                  <ResumenAvance avance={avance} id={id} />
                ) : calculo.estado === 'error' ? (
                  <EstadoError
                    nivel={3}
                    titulo="No pudimos calcular el avance"
                    descripcion={calculo.error?.detalle ?? ''}
                    onReintentar={calculo.reintentar}
                  />
                ) : calculo.datos ? (
                  <p className={estilos.secundario}>
                    El contrato tiene demasiadas atenciones para calcular aquí su avance: consúltalo en el informe del
                    servicio.
                  </p>
                ) : (
                  <EstadoCarga forma="tarjetas" texto="Calculando el avance…" />
                )}
                <ListaDescripcion
                  elementos={[
                    {
                      etiqueta: 'Proveedor',
                      valor: contrato.proveedor_nombre,
                      ancho: true,
                    },
                    {
                      etiqueta: 'Tipo de servicio',
                      valor: contrato.tipo_servicio_nombre,
                    },
                    {
                      etiqueta: 'Área o metrado estimado',
                      valor: contrato.area_metrado_estimado,
                    },
                    {
                      etiqueta: 'Frecuencia pactada',
                      valor: contrato.frecuencia_pactada,
                    },
                    ...(verMontos && contrato.monto_fijo !== null
                      ? [
                          {
                            etiqueta: 'Monto fijo',
                            valor: <span className="cifra">{textoMonto(contrato.monto_fijo)}</span>,
                          },
                        ]
                      : []),
                    {
                      etiqueta: 'Inicio de la vigencia',
                      valor: <span className="cifra">{formatearFecha(contrato.vigencia_inicio)}</span>,
                    },
                    {
                      etiqueta: 'Fin de la vigencia',
                      valor: <span className="cifra">{formatearFecha(contrato.vigencia_fin)}</span>,
                    },
                    {
                      etiqueta: 'Condiciones',
                      valor: contrato.condiciones,
                      ancho: true,
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            valor: 'atenciones',
            texto: 'Atenciones',
            contenido: <div className={estilos.contenidoPanel}>{pestanaAtenciones}</div>,
          },
        ]}
      />
    )
  }

  // Mientras no hay contrato, el panel de estado también es un panel (cerrable) con el nombre de la transición.
  if (!contrato) {
    return (
      <PanelLateral abierto onCerrar={onCerrar} titulo="Contrato" viewTransitionName={panel(id)}>
        {cuerpo}
      </PanelLateral>
    )
  }
  return cuerpo
}
