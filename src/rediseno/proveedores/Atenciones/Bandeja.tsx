/**
 * Bandeja de atenciones (RD-51, M5-02). Dos modos:
 * - `completa` (pestaña Atenciones): búsqueda, filtros de estado, origen, clase y contrato, fecha y área (RD-85) y
 *   página (25) en la URL. «Riesgo» es solo una etiqueta de la fila.
 * - `recientes` (vista principal): las últimas atenciones, sin filtros.
 * Estados de carga, error, vacío y sin acceso (403). Fondo liso: el mapa no interviene.
 */
import { useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Paginacion from '@/design-system/Paginacion'
import Selector, { OPCION_TODOS } from '@/design-system/Selector'
import SelectorBuscable from '@/design-system/SelectorBuscable'
import { useConsulta } from '@/hooks/useConsulta'
import { obtenerAreaVerde } from '@/services/api/areasVerdes'
import { obtenerContrato } from '@/services/api/maestrosTercerizados'
import { listarAreasVerdes, listarAtenciones, listarContratos } from '@/services/api/tercerizados'
import type { AreaVerde, Contrato } from '@/types/tercerizados'
import { ESTADOS_ATENCION, OPCIONES_CLASE, OPCIONES_ORIGEN } from '@/utils/estadosTercerizados'
import { LARGO_MAXIMO_BUSQUEDA } from '@/utils/filtrosBandeja'
import { formatearNumero, SIN_VALOR } from '@/utils/formato'
import { rutaAtenciones } from '../enlaces'
import estilos from './Atenciones.module.css'
import BotonExportar from './BotonExportar'
import FilaAtencion from './FilaAtencion'
import { CLAVES_FILTRO, conCambios, filtrosDeUrl, hayFiltrosAtenciones, POR_PAGINA, RECIENTES } from './filtros'

const OPCIONES_ESTADO = ESTADOS_ATENCION.map((estado) => ({
  valor: estado,
  texto: estado,
}))

export type ModoBandeja = 'completa' | 'recientes'

type AreaElegida = Pick<AreaVerde, 'id' | 'nombre'>

/** Lista de filas con carga, error, vacío y sin acceso; la comparten los dos modos. */
export default function Bandeja({ modo }: { modo: ModoBandeja }) {
  const completa = modo === 'completa'
  const [parametros, setParametros] = useSearchParams()
  const { pathname, search } = useLocation()
  const { filtros, pagina } = completa ? filtrosDeUrl(parametros) : { filtros: {}, pagina: 1 }
  const conFiltros = hayFiltrosAtenciones(filtros)

  const consulta = useConsulta(
    JSON.stringify([modo, filtros, pagina]),
    (signal) => listarAtenciones(filtros, pagina, signal),
    (datos) => datos.results.length === 0,
  )
  // Para enseñar el contrato ya elegido en el filtro (el selector solo trae resultados mientras se escribe).
  const contratoFiltro = useConsulta(
    completa && filtros.contrato_id ? `contrato-filtro|${filtros.contrato_id}` : null,
    (signal) => obtenerContrato(filtros.contrato_id as number, signal),
  )
  const contratoAplicado: Contrato | null = filtros.contrato_id ? (contratoFiltro.datos ?? null) : null
  // Lo mismo con el área; si no se puede leer (permiso de inventario), se enseña su número.
  const areaFiltro = useConsulta(
    completa && filtros.area_verde_id ? `area-filtro|${filtros.area_verde_id}` : null,
    (signal) => obtenerAreaVerde(filtros.area_verde_id as number, signal),
  )
  const areaAplicada: AreaElegida | null = filtros.area_verde_id
    ? (areaFiltro.datos ?? {
        id: filtros.area_verde_id,
        nombre: `Área n.º ${filtros.area_verde_id}`,
      })
    : null

  // Borrador de la búsqueda: se aplica al enviar; si la URL cambia, el borrador la refleja.
  const [borrador, setBorrador] = useState(filtros.q ?? '')
  const [qPrevia, setQPrevia] = useState(filtros.q ?? '')
  if ((filtros.q ?? '') !== qPrevia) {
    setQPrevia(filtros.q ?? '')
    setBorrador(filtros.q ?? '')
  }

  /** Cambiar un filtro vuelve a la primera página. */
  function aplicar(cambios: Record<string, string | null>) {
    setParametros(conCambios(parametros, { pagina: null, ...cambios }), {
      replace: true,
    })
  }

  function limpiar() {
    aplicar(Object.fromEntries(CLAVES_FILTRO.map((clave) => [clave, null])))
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = borrador.trim()
    if (texto === (filtros.q ?? '')) consulta.reintentar()
    else aplicar({ q: texto || null })
  }

  const filas = (consulta.datos?.results ?? []).slice(0, completa ? undefined : RECIENTES)
  const total = consulta.datos?.count ?? 0

  let cuerpo
  if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    cuerpo = (
      <EstadoSinAcceso
        titulo="No puedes ver las atenciones"
        descripcion="Tu cuenta no tiene permiso para consultar atenciones de proveedores."
      />
    )
  } else if (consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1) {
    cuerpo = (
      <EstadoVacio
        titulo="Esta página ya no tiene atenciones"
        descripcion="Los resultados cambiaron desde que se abrió la bandeja."
        accion={
          <Boton variante="secundario" onClick={() => aplicar({})}>
            Ir a la primera página
          </Boton>
        }
      />
    )
  } else if (consulta.estado === 'error') {
    cuerpo = (
      <EstadoError
        titulo="No pudimos cargar las atenciones"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (consulta.estado === 'vacio') {
    cuerpo = conFiltros ? (
      <EstadoVacio
        titulo="Sin atenciones con estos filtros"
        descripcion="Prueba con otra búsqueda o quita algún filtro."
        accion={
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        }
      />
    ) : (
      <EstadoVacio
        titulo="Aún no hay atenciones tercerizadas"
        descripcion="Aparecerán aquí cuando el jefe de sección registre la primera."
      />
    )
  } else if (filas.length === 0) {
    cuerpo = <EstadoCarga forma="tarjetas" />
  } else {
    cuerpo = (
      <>
        <ul className={estilos.lista} aria-label="Atenciones">
          {filas.map((a) => (
            <FilaAtencion key={a.id} atencion={a} volverA={`${pathname}${search}`} />
          ))}
        </ul>
        {completa && (
          <Paginacion
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            onCambiar={(nueva) =>
              setParametros(
                conCambios(parametros, {
                  pagina: nueva > 1 ? String(nueva) : null,
                }),
                { replace: true },
              )
            }
          />
        )}
      </>
    )
  }

  return (
    <section className={estilos.seccion} aria-label={completa ? 'Atenciones' : 'Atenciones recientes'}>
      {completa ? (
        <>
          <form role="search" aria-label="Filtrar atenciones" className={estilos.filtros} onSubmit={buscar}>
            <CampoFormulario
              id="atenciones-busqueda"
              etiqueta="Buscar atenciones"
              type="search"
              ayuda="Código, descripción, OC, contrato, proveedor, servicio o unidad"
              maxLength={LARGO_MAXIMO_BUSQUEDA}
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
            />
            <Selector
              id="atenciones-estado"
              etiqueta="Estado"
              valor={filtros.estado ?? ''}
              opciones={OPCIONES_ESTADO}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => aplicar({ estado: valor || null })}
            />
            <Selector
              id="atenciones-origen"
              etiqueta="Origen"
              valor={filtros.origen ?? ''}
              opciones={OPCIONES_ORIGEN}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => aplicar({ origen: valor || null })}
            />
            <Selector
              id="atenciones-clase"
              etiqueta="Modalidad"
              valor={filtros.clase ?? ''}
              opciones={OPCIONES_CLASE}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => aplicar({ clase: valor || null })}
            />
            <SelectorBuscable<Contrato>
              id="atenciones-contrato"
              etiqueta="Contrato"
              ayuda="Busca por número o proveedor"
              valor={contratoAplicado}
              claveDe={(c) => c.id}
              textoDe={(c) => c.numero}
              detalleDe={(c) => c.proveedor_nombre ?? SIN_VALOR}
              buscar={(q, signal) => listarContratos({ q: q || undefined }, signal)}
              onCambiar={(contrato) => aplicar({ contrato_id: contrato ? String(contrato.id) : null })}
            />
            <SelectorBuscable<AreaElegida>
              id="atenciones-area"
              etiqueta="Área verde"
              ayuda="Busca por nombre"
              valor={areaAplicada}
              claveDe={(area) => area.id}
              textoDe={(area) => area.nombre}
              buscar={(q, signal) => listarAreasVerdes({ q: q || undefined }, signal)}
              onCambiar={(area) => aplicar({ area_verde_id: area ? String(area.id) : null })}
            />
            <CampoFormulario
              id="atenciones-desde"
              etiqueta="Desde"
              type="date"
              ayuda="Fecha de inicio o de registro"
              value={filtros.desde ?? ''}
              max={filtros.hasta}
              onChange={(e) => aplicar({ desde: e.target.value || null })}
            />
            <CampoFormulario
              id="atenciones-hasta"
              etiqueta="Hasta"
              type="date"
              value={filtros.hasta ?? ''}
              min={filtros.desde}
              onChange={(e) => aplicar({ hasta: e.target.value || null })}
            />
            <div className={estilos.accionesFiltro}>
              <Boton type="submit" variante="secundario">
                Buscar
              </Boton>
              {conFiltros && (
                <Boton variante="fantasma" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              )}
              <BotonExportar filtros={filtros} />
            </div>
          </form>
          <p className={`${estilos.resumen} cifra`} aria-live="polite">
            {consulta.estado === 'exito'
              ? `${formatearNumero(total)} ${total === 1 ? 'atención' : 'atenciones'}${conFiltros ? ' con estos filtros' : ''}`
              : ''}
          </p>
        </>
      ) : (
        <div className={estilos.cabeceraSeccion}>
          <h2 className={estilos.tituloSeccion}>Atenciones recientes</h2>
          <BotonEnlace to={rutaAtenciones()} variante="enlace">
            Ver todas las atenciones
          </BotonEnlace>
        </div>
      )}
      {cuerpo}
    </section>
  )
}
