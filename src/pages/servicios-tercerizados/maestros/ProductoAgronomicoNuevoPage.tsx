// RF-FIT-003 · Registrar un producto agronómico
/**
 * Registro de un producto del catálogo usado en control fitosanitario.
 *
 * - Solo el jefe de sección administra el catálogo (el back-end lo vuelve a comprobar).
 * - Nombre obligatorio; principio activo y presentación opcionales.
 * - Nombre ya registrado: el servidor responde 409 y la pantalla ofrece abrir el producto existente.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeAdministrarProductosAgronomicos } from '@/config/permisosMaestros'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { registrarProductoAgronomico } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import { BORRADOR_PRODUCTO_VACIO, construirProducto, hayErrores, validarProducto, type BorradorProducto } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposProductoAgronomico, { IDS_PRODUCTO, ORDEN_PRODUCTO } from './CamposProductoAgronomico'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar producto agronómico'

export default function ProductoAgronomicoNuevoPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.productosAgronomicos, { texto: TITULO }])
  const rol = useRolTercerizados()
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorProducto>(BORRADOR_PRODUCTO_VACIO)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  if (!puedeAdministrarProductosAgronomicos(rol)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección administra el catálogo"
        descripcion="Puedes consultar los productos agronómicos desde la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.productosAgronomicos} variante="secundario">
            Ir a productos agronómicos
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarProducto(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN_PRODUCTO.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_PRODUCTO[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(cambios: Partial<BorradorProducto>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarProducto(borrador)
    const primero = ORDEN_PRODUCTO.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_PRODUCTO[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creado = await registrarProductoAgronomico(construirProducto(borrador))
      navegar(RUTAS_TERCERIZADOS.productosAgronomicos, {
        replace: true,
        state: { aviso: `Producto «${creado.nombre}» registrado.` } satisfies EstadoNavegacionMaestros,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'registrar el producto'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  function verExistente() {
    navegar(`${RUTAS_TERCERIZADOS.productosAgronomicos}?q=${encodeURIComponent(borrador.nombre.trim())}`)
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label={TITULO}>
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
          Guardar producto
        </Boton>
        <BotonEnlace to={RUTAS_TERCERIZADOS.productosAgronomicos} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
