// RF-SER-002 · Editar un contrato
/**
 * Edición de los datos de un contrato ya registrado: proveedor, servicio, costo, frecuencia, vigencia y
 * condiciones. Solo el jefe de sección edita contratos (el back-end lo vuelve a comprobar). Mismos campos y
 * validaciones que «Registrar contrato» (`CamposContrato`); el número del contrato no cambia.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaDetalleContrato, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { editarContrato, obtenerContrato } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import { hoyLima } from '@/utils/instanteLima'
import { borradorDeContrato, construirContrato, hayErrores, validarContrato, type BorradorContrato } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposContrato, { IDS_CONTRATO, ORDEN_CONTRATO } from './CamposContrato'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import { volverAContrato, type EstadoNavegacionContrato } from './filtrosMaestros'
import estilos from './Maestros.module.css'

export default function ContratoEditarPage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const rol = useRolTercerizados()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = volverAContrato(state)

  const consulta = useConsulta(id === null ? null : `contrato|${id}`, (signal) => obtenerContrato(id as number, signal))
  // Lo que la persona ya cambió; mientras no toque nada, el borrador sale del contrato cargado.
  const [cambios, setCambios] = useState<BorradorContrato | null>(null)
  const borrador = cambios ?? (consulta.datos ? borradorDeContrato(consulta.datos) : null)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  usePaginaActual(consulta.datos ? `Editar ${consulta.datos.numero}` : 'Editar contrato', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.proveedoresContratos,
    { texto: consulta.datos ? consulta.datos.numero : 'Contrato' },
    { texto: 'Editar' },
  ])

  if (!puedeRegistrarProveedoresYContratos(rol)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección edita contratos"
        descripcion="Puedes consultar los datos del contrato desde su ficha."
        accion={
          <BotonEnlace to={id === null ? RUTAS_TERCERIZADOS.proveedoresContratos : rutaDetalleContrato(id)} variante="secundario">
            {id === null ? 'Ir a proveedores y contratos' : 'Ir a la ficha del contrato'}
          </BotonEnlace>
        }
      />
    )
  }

  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    return (
      <EstadoVacio
        titulo="No existe este contrato"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={`${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  }
  if (consulta.estado === 'error' && !borrador) {
    return <EstadoError titulo="No pudimos cargar el contrato" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!borrador) {
    return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }

  const errores = intentado ? validarContrato(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN_CONTRATO.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_CONTRATO[clave],
    mensaje: errores[clave] as string,
  }))
  const vencido = Boolean(borrador.fin) && !errores.fin && borrador.fin < hoyLima()

  function cambiar(parciales: Partial<BorradorContrato>) {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- cambiar solo se llama una vez montado el borrador
    setCambios({ ...borrador!, ...parciales })
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    // oxlint-disable-next-line typescript/no-non-null-assertion -- guardar solo se llama una vez montado el borrador
    const datos = borrador!
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarContrato(datos)
    const primero = ORDEN_CONTRATO.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_CONTRATO[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- guardar solo se llama con la página ya cargada (id no nulo)
      const actualizado = await editarContrato(id!, construirContrato(datos))
      navegar(rutaDetalleContrato(actualizado.id), {
        replace: true,
        state: { volverA, aviso: `Contrato ${actualizado.numero} actualizado.` } satisfies EstadoNavegacionContrato,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'editar el contrato'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label="Editar contrato">
      <LeyendaObligatorio />
      <ResumenErrores
        titulo={`Falta información: revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`}
        errores={resumen}
      />

      <CamposContrato borrador={borrador} errores={errores} vencido={vencido} onCambiar={cambiar} />

      {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void guardar()} />}

      <div className={estilos.botones}>
        <Boton
          type="submit"
          variante="primario"
          cargando={enviando}
          deshabilitado={intentado && hayErrores(errores)}
          ayudaDeshabilitado="Corrige los campos marcados para poder guardar"
          onClickDeshabilitado={() => void guardar()}
        >
          Guardar cambios
        </Boton>
        <BotonEnlace to={rutaDetalleContrato(id)} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
