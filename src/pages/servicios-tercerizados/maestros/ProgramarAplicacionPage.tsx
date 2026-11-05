// RF-FIT-006 · Programar una aplicación adicional
/**
 * Programa una aplicación adicional del ejemplar marcado con atención especial (RF-INV-011).
 *
 * - Solo el jefe de sección la programa (el back-end lo vuelve a comprobar).
 * - RN-010: no se admite más allá de las aplicaciones adicionales fijadas al marcar el ejemplar.
 * - Si el servidor avisa una restricción del calendario de Planificación, hace falta un motivo para
 *   confirmar igual.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto, LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeRegistrarAtencion } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaDetalleAtencionEspecial, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { listarContratosMaestro, obtenerAtencionEspecial, programarAplicacionAdicional } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { SIN_VALOR } from '@/utils/formato'
import {
  BORRADOR_APLICACION_VACIO,
  construirAplicacionAdicional,
  hayErrores,
  textoAplicaciones,
  validarAplicacionAdicional,
  type BorradorAplicacionAdicional,
  type ErroresAplicacionAdicional,
} from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Programar aplicación adicional'

const IDS = { contrato: 'aplicacion-contrato', fechaInicio: 'aplicacion-fecha-inicio', fechaFin: 'aplicacion-fecha-fin' } as const
const ORDEN: (keyof ErroresAplicacionAdicional)[] = ['contrato', 'fechaInicio', 'fechaFin']

function detalleContrato(c: ContratoMaestro) {
  return c.proveedor_nombre ?? SIN_VALOR
}

export default function ProgramarAplicacionPage() {
  const { id: parametro } = useParams()
  const especialId = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const rol = useRolTercerizados()
  const navegar = useNavigate()

  const especial = useConsulta(especialId === null ? null : `atencion-especial|${especialId}`, (signal) =>
    obtenerAtencionEspecial(especialId as number, signal),
  )

  usePaginaActual(TITULO, [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.controlFitosanitario,
    { texto: especial.datos ? especial.datos.ejemplar_codigo : 'Ficha' },
    { texto: 'Programar aplicación' },
  ])

  const [borrador, setBorrador] = useState<BorradorAplicacionAdicional>(BORRADOR_APLICACION_VACIO)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  if (especialId === null || (especial.estado === 'error' && especial.error?.estado === 404)) {
    return (
      <EstadoVacio
        titulo="No existe este ejemplar marcado"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
            Ir a control fitosanitario
          </BotonEnlace>
        }
      />
    )
  }
  if (!puedeRegistrarAtencion(rol)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección programa aplicaciones adicionales"
        descripcion="Puedes consultar el ejemplar y su historial desde su ficha."
        accion={
          <BotonEnlace to={rutaDetalleAtencionEspecial(especialId)} variante="secundario">
            Ir a la ficha del ejemplar
          </BotonEnlace>
        }
      />
    )
  }
  if (especial.estado === 'error' && !especial.datos) {
    return <EstadoError titulo="No pudimos cargar la ficha" descripcion={especial.error?.detalle ?? ''} onReintentar={especial.reintentar} />
  }
  if (!especial.datos) {
    return especial.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }
  if (especial.datos.aplicaciones_realizadas >= especial.datos.aplicaciones_adicionales) {
    return (
      <EstadoVacio
        titulo="Ya se programaron todas las aplicaciones adicionales"
        descripcion={`Este ejemplar tiene ${textoAplicaciones(especial.datos.aplicaciones_realizadas, especial.datos.aplicaciones_adicionales)} aplicaciones adicionales programadas.`}
        accion={
          <BotonEnlace to={rutaDetalleAtencionEspecial(especialId)} variante="secundario">
            Ir a la ficha del ejemplar
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarAplicacionAdicional(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(cambios: Partial<BorradorAplicacionAdicional>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current || especialId === null) return
    setIntentado(true)
    const nuevos = validarAplicacionAdicional(borrador)
    const primero = ORDEN.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      await programarAplicacionAdicional(especialId, construirAplicacionAdicional(borrador))
      navegar(rutaDetalleAtencionEspecial(especialId), {
        replace: true,
        state: { aviso: 'Aplicación adicional programada.' } satisfies EstadoNavegacionMaestros,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'programar la aplicación'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label={TITULO}>
      <p className={estilos.descripcion}>
        {especial.datos.ejemplar_codigo} · {especial.datos.plaga_nombre} ·{' '}
        {textoAplicaciones(especial.datos.aplicaciones_realizadas, especial.datos.aplicaciones_adicionales)} aplicaciones adicionales
      </p>
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`} errores={resumen} />

      <Tarjeta titulo="Contrato" relleno="amplio">
        <div className={estilos.cuadricula}>
          <SelectorBuscable<ContratoMaestro>
            id={IDS.contrato}
            etiqueta="Contrato vigente de control fitosanitario"
            obligatorio
            ayuda={borrador.contrato ? undefined : 'Busca por número o proveedor. Solo se listan contratos vigentes hoy.'}
            error={errores.contrato}
            ocultarDetalleElegido
            valor={borrador.contrato}
            claveDe={(c) => c.id}
            textoDe={(c) => c.numero}
            detalleDe={detalleContrato}
            buscar={(q, signal) => listarContratosMaestro({ q: q || undefined, vigente: true }, 1, signal)}
            onCambiar={(contrato) => cambiar({ contrato })}
          />
        </div>
        {borrador.contrato && (
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Proveedor', valor: borrador.contrato.proveedor_nombre },
              { etiqueta: 'Servicio', valor: borrador.contrato.tipo_servicio_nombre },
              { etiqueta: 'Vigencia', valor: `${borrador.contrato.vigencia_inicio} al ${borrador.contrato.vigencia_fin}` },
            ]}
          />
        )}
      </Tarjeta>

      <Tarjeta titulo="Fecha de la aplicación" relleno="amplio">
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS.fechaInicio}
            etiqueta="Inicio"
            obligatorio
            type="date"
            error={errores.fechaInicio}
            value={borrador.fechaInicio}
            onChange={(e) => cambiar({ fechaInicio: e.target.value })}
          />
          <CampoFormulario
            id={IDS.fechaFin}
            etiqueta="Fin"
            obligatorio
            type="date"
            error={errores.fechaFin}
            value={borrador.fechaFin}
            onChange={(e) => cambiar({ fechaFin: e.target.value })}
          />
        </div>
        <AreaTexto
          id="aplicacion-motivo"
          etiqueta="Motivo"
          ayuda="Solo hace falta si el servidor avisa que la fecha coincide con una restricción del calendario"
          rows={2}
          value={borrador.motivo}
          onChange={(e) => cambiar({ motivo: e.target.value })}
        />
      </Tarjeta>

      {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void guardar()} />}

      <div className={estilos.botones}>
        <Boton
          type="submit"
          variante="primario"
          cargando={enviando}
          deshabilitado={intentado && hayErrores(errores)}
          ayudaDeshabilitado="Completa los campos señalados para poder guardar"
          onClickDeshabilitado={() => void guardar()}
        >
          Programar aplicación
        </Boton>
        <BotonEnlace to={rutaDetalleAtencionEspecial(especialId)} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
