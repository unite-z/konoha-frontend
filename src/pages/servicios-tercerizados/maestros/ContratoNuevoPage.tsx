// RF-SER-002 · Registrar un contrato
/**
 * Registro de un contrato de servicio tercerizado (Guía Web 5.3: formulario de una pantalla).
 *
 * - Solo el jefe de sección registra contratos (el back-end lo vuelve a comprobar).
 * - Obligatorios: proveedor, tipo de servicio, área o metrado estimado, monto fijo, frecuencia pactada (veces
 *   y período, por ejemplo 4 al año) y vigencia. Las condiciones son opcionales. No se puede confirmar si
 *   falta algo: se señalan los campos.
 * - El número del contrato lo asigna el servidor. Un contrato con vigencia ya terminada se acepta y queda
 *   como histórico (no se puede usar en nuevas atenciones).
 * - Si falla el guardado no se crea ningún registro parcial.
 * - Si se llega desde la ficha de un proveedor («Registrar contrato»), ese proveedor ya viene elegido y, al
 *   confirmar o cancelar, se vuelve a su ficha en vez de a la lista.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaDetalleProveedor, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { registrarContrato } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import { hoyLima } from '@/utils/instanteLima'
import { BORRADOR_CONTRATO_VACIO, construirContrato, hayErrores, validarContrato, type BorradorContrato } from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import CamposContrato, { IDS_CONTRATO, ORDEN_CONTRATO } from './CamposContrato'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import { proveedorDeOrigen, volverALista, type EstadoNavegacionMaestros } from './filtrosMaestros'
import type { EstadoNavegacionProveedor } from './ListaProveedores'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar contrato'

export default function ContratoNuevoPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.proveedoresContratos, { texto: 'Registrar contrato' }])
  const permisos = usePermisos()
  const navegar = useNavigate()
  const { state } = useLocation()
  // Desde la ficha de un proveedor se llega con ese proveedor ya elegido y se vuelve a su ficha.
  const [origen] = useState(() => proveedorDeOrigen(state))
  const volverA = volverALista(state)
  const destinoTras = origen ? rutaDetalleProveedor(origen.id) : `${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`

  const [borrador, setBorrador] = useState<BorradorContrato>({ ...BORRADOR_CONTRATO_VACIO, proveedor: origen })
  // Tras el primer intento de confirmar, los errores se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  if (!puedeRegistrarProveedoresYContratos(permisos)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección registra contratos"
        descripcion="Puedes consultar los contratos desde la lista."
        accion={
          <BotonEnlace to={`${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarContrato(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN_CONTRATO.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS_CONTRATO[clave],
    mensaje: errores[clave] as string,
  }))
  const vencido = Boolean(borrador.fin) && !errores.fin && borrador.fin < hoyLima()

  function cambiar(cambios: Partial<BorradorContrato>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function confirmar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarContrato(borrador)
    const primero = ORDEN_CONTRATO.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS_CONTRATO[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creado = await registrarContrato(construirContrato(borrador))
      const aviso = `Contrato ${creado.numero} registrado.`
      navegar(destinoTras, {
        replace: true,
        state: origen ? ({ volverA, aviso } satisfies EstadoNavegacionProveedor) : ({ aviso } satisfies EstadoNavegacionMaestros),
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'registrar el contrato'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={confirmar} noValidate aria-label={TITULO}>
      <LeyendaObligatorio />
      <ResumenErrores
        titulo={`Falta información: revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de confirmar`}
        errores={resumen}
      />

      <CamposContrato borrador={borrador} errores={errores} vencido={vencido} onCambiar={cambiar} />

      {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void confirmar()} />}

      <div className={estilos.botones}>
        <Boton
          type="submit"
          variante="primario"
          cargando={enviando}
          deshabilitado={intentado && hayErrores(errores)}
          ayudaDeshabilitado="Completa los campos señalados para poder confirmar"
          onClickDeshabilitado={() => void confirmar()}
        >
          Confirmar contrato
        </Boton>
        <BotonEnlace to={destinoTras} state={origen ? ({ volverA } satisfies EstadoNavegacionProveedor) : undefined} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
