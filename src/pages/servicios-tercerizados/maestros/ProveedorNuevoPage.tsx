// RF-SER-001 · Registrar un proveedor
/**
 * Registro de un proveedor de servicios tercerizados (Guía Web 5.3: formulario de una pantalla).
 *
 * - Solo el jefe de sección registra proveedores (el back-end lo vuelve a comprobar).
 * - Razón social y RUC obligatorios; contacto (nombre, teléfono y correo) y vínculo con otras empresas
 *   opcionales. «Subsidiaria» y «Vinculada» piden el proveedor con el que se vinculan.
 * - RUC ya registrado: el servidor responde 409 y la pantalla ofrece abrir el proveedor existente.
 * - Si falla el guardado no se crea ningún registro parcial (el servidor lo registra todo en una transacción).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { registrarProveedor } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import { BORRADOR_PROVEEDOR_VACIO, construirProveedor, hayErrores, validarProveedor, type BorradorProveedor } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposProveedor, { IDS_PROVEEDOR, ORDEN_PROVEEDOR } from './CamposProveedor'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar proveedor'

export default function ProveedorNuevoPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.proveedoresContratos, { texto: 'Registrar proveedor' }])
  const rol = useRolTercerizados()
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorProveedor>(BORRADOR_PROVEEDOR_VACIO)
  // Tras el primer intento de guardar, los errores se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  if (!puedeRegistrarProveedoresYContratos(rol)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección registra proveedores"
        descripcion="Puedes consultar los proveedores y sus contratos desde la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.proveedoresContratos} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarProveedor(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN_PROVEEDOR.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_PROVEEDOR[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(cambios: Partial<BorradorProveedor>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarProveedor(borrador)
    const primero = ORDEN_PROVEEDOR.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_PROVEEDOR[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creado = await registrarProveedor(construirProveedor(borrador))
      navegar(RUTAS_TERCERIZADOS.proveedoresContratos, {
        replace: true,
        state: { aviso: `Proveedor «${creado.razon_social}» registrado.` } satisfies EstadoNavegacionMaestros,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'registrar el proveedor'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  function verExistente() {
    navegar(`${RUTAS_TERCERIZADOS.proveedoresContratos}?q=${encodeURIComponent(borrador.ruc.trim())}`)
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label={TITULO}>
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
          Guardar proveedor
        </Boton>
        <BotonEnlace to={RUTAS_TERCERIZADOS.proveedoresContratos} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
