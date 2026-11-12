// RF-SER-001 · Editar un proveedor
/**
 * Edición de los datos de un proveedor ya registrado: razón social, RUC, persona de contacto y vínculo
 * con otras empresas. Solo el jefe de sección edita proveedores (el back-end lo vuelve a comprobar).
 * Mismos campos y validaciones que «Registrar proveedor» (`CamposProveedor`).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeCambiarEstadoProveedor } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaDetalleProveedor } from '@/router/rutasApp'
import { editarProveedor, obtenerProveedor } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import { borradorDeProveedor, construirProveedor, hayErrores, validarProveedor, type BorradorProveedor } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposProveedor, { IDS_PROVEEDOR, ORDEN_PROVEEDOR } from './CamposProveedor'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import { volverALista } from './filtrosMaestros'
import type { EstadoNavegacionProveedor } from './ListaProveedores'
import estilos from './Maestros.module.css'

export default function ProveedorEditarPage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const permisos = usePermisos()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = volverALista(state)

  const consulta = useConsulta(id === null ? null : `proveedor|${id}`, (signal) => obtenerProveedor(id as number, signal))
  // Lo que la persona ya cambió; mientras no toque nada, el borrador sale del proveedor cargado.
  const [cambios, setCambios] = useState<BorradorProveedor | null>(null)
  const borrador = cambios ?? (consulta.datos ? borradorDeProveedor(consulta.datos) : null)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  usePaginaActual(consulta.datos ? `Editar «${consulta.datos.razon_social}»` : 'Editar proveedor', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.proveedoresContratos,
    { texto: consulta.datos ? consulta.datos.razon_social : 'Proveedor' },
    { texto: 'Editar' },
  ])

  if (!puedeCambiarEstadoProveedor(permisos)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección edita proveedores"
        descripcion="Puedes consultar los datos del proveedor desde su ficha."
        accion={
          <BotonEnlace to={id === null ? RUTAS_TERCERIZADOS.proveedoresContratos : rutaDetalleProveedor(id)} variante="secundario">
            {id === null ? 'Ir a proveedores y contratos' : 'Ir a la ficha del proveedor'}
          </BotonEnlace>
        }
      />
    )
  }

  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    return (
      <EstadoVacio
        titulo="No existe este proveedor"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.proveedoresContratos} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  }
  if (consulta.estado === 'error' && !borrador) {
    return <EstadoError titulo="No pudimos cargar el proveedor" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!borrador) {
    return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }

  const errores = intentado ? validarProveedor(borrador, id) : {}
  const resumen: ErrorResumen[] = ORDEN_PROVEEDOR.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_PROVEEDOR[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(parciales: Partial<BorradorProveedor>) {
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
    // oxlint-disable-next-line typescript/no-non-null-assertion -- guardar solo se llama con la página ya cargada (id no nulo)
    const nuevos = validarProveedor(datos, id!)
    const primero = ORDEN_PROVEEDOR.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_PROVEEDOR[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- guardar solo se llama con la página ya cargada (id no nulo)
      const actualizado = await editarProveedor(id!, construirProveedor(datos))
      navegar(rutaDetalleProveedor(actualizado.id), {
        replace: true,
        state: { volverA, aviso: `Proveedor «${actualizado.razon_social}» actualizado.` } satisfies EstadoNavegacionProveedor,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'editar el proveedor'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  function verExistente() {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- solo se ofrece tras un 409 con el borrador ya montado
    navegar(`${RUTAS_TERCERIZADOS.proveedoresContratos}?q=${encodeURIComponent(borrador!.ruc.trim())}`)
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label="Editar proveedor">
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`} errores={resumen} />

      <CamposProveedor borrador={borrador} errores={errores} onCambiar={cambiar} />

      {fallo && (
        <AvisoFallo
          fallo={fallo}
          onReintentar={() => void guardar()}
          existente={{
            titulo: 'Este RUC ya está registrado',
            accion: { texto: 'Ver el proveedor existente', onClick: verExistente },
          }}
        />
      )}

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
        <BotonEnlace to={rutaDetalleProveedor(id)} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
