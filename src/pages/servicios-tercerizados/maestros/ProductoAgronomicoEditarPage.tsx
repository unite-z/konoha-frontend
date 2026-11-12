// RF-FIT-003 · Editar un producto agronómico
/**
 * Edición de los datos de un producto ya registrado: nombre, principio activo y presentación. Solo el
 * jefe de sección edita el catálogo (el back-end lo vuelve a comprobar). Mismos campos y validaciones
 * que «Registrar producto» (`CamposProductoAgronomico`). Habilitar o inhabilitar el producto se hace desde
 * su ficha, no aquí.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeAdministrarProductosAgronomicos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaDetalleProductoAgronomico, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { editarProductoAgronomico, obtenerProductoAgronomico } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import { borradorDeProducto, construirProducto, hayErrores, validarProducto, type BorradorProducto } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposProductoAgronomico, { IDS_PRODUCTO, ORDEN_PRODUCTO } from './CamposProductoAgronomico'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import { volverALista, type EstadoNavegacionContrato } from './filtrosMaestros'
import estilos from './Maestros.module.css'

export default function ProductoAgronomicoEditarPage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const permisos = usePermisos()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = volverALista(state)

  const consulta = useConsulta(id === null ? null : `producto-agronomico|${id}`, (signal) => obtenerProductoAgronomico(id as number, signal))
  const producto = consulta.datos
  // Lo que la persona ya cambió; mientras no toque nada, el borrador sale del producto cargado.
  const [cambios, setCambios] = useState<BorradorProducto | null>(null)
  const borrador = cambios ?? (producto ? borradorDeProducto(producto) : null)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  usePaginaActual(consulta.datos ? `Editar «${consulta.datos.nombre}»` : 'Editar producto agronómico', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.productosAgronomicos,
    { texto: 'Editar' },
  ])

  if (!puedeAdministrarProductosAgronomicos(permisos)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección edita el catálogo"
        descripcion="Puedes consultar los datos del producto desde su ficha."
        accion={
          <BotonEnlace to={id === null ? RUTAS_TERCERIZADOS.productosAgronomicos : rutaDetalleProductoAgronomico(id)} variante="secundario">
            {id === null ? 'Ir a productos agronómicos' : 'Ir a la ficha del producto'}
          </BotonEnlace>
        }
      />
    )
  }

  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    return (
      <EstadoVacio
        titulo="No existe este producto"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.productosAgronomicos} variante="secundario">
            Ir a productos agronómicos
          </BotonEnlace>
        }
      />
    )
  }
  if (consulta.estado === 'error' && !producto) {
    return <EstadoError titulo="No pudimos cargar el producto" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!producto || !borrador) {
    return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }

  const errores = intentado ? validarProducto(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN_PRODUCTO.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_PRODUCTO[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(parciales: Partial<BorradorProducto>) {
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
    const nuevos = validarProducto(datos)
    const primero = ORDEN_PRODUCTO.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_PRODUCTO[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- guardar solo se llama con la página ya cargada (id no nulo)
      const actualizado = await editarProductoAgronomico(id!, construirProducto(datos))
      navegar(rutaDetalleProductoAgronomico(actualizado.id), {
        replace: true,
        state: { volverA, aviso: `Producto «${actualizado.nombre}» actualizado.` } satisfies EstadoNavegacionContrato,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'editar el producto'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  function verExistente() {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- solo se ofrece tras un 409 con el borrador ya montado
    navegar(`${RUTAS_TERCERIZADOS.productosAgronomicos}?q=${encodeURIComponent(borrador!.nombre.trim())}`)
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label="Editar producto agronómico">
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`} errores={resumen} />

      <CamposProductoAgronomico borrador={borrador} errores={errores} onCambiar={cambiar} />

      {fallo && (
        <AvisoFallo
          fallo={fallo}
          onReintentar={() => void guardar()}
          existente={{
            titulo: 'Este nombre ya está registrado',
            accion: { texto: 'Ver el producto existente', onClick: verExistente },
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
        <BotonEnlace to={rutaDetalleProductoAgronomico(id)} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
