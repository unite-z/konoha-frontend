// RF-SER-002 · Registrar un contrato
/**
 * Registro de un contrato de servicio tercerizado (Guía Web 5.3: formulario de una pantalla).
 *
 * - Solo el jefe de sección registra contratos (el back-end lo vuelve a comprobar).
 * - Obligatorios: proveedor, tipo de servicio, área o metrado estimado, monto fijo, frecuencia pactada y
 *   vigencia. Las condiciones son opcionales. No se puede confirmar si falta algo: se señalan los campos.
 * - El número del contrato lo asigna el servidor. Un contrato con vigencia ya terminada se acepta y queda
 *   como histórico (no se puede usar en nuevas atenciones).
 * - Si falla el guardado no se crea ningún registro parcial.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import CampoFormulario, {
  AreaTexto,
  LeyendaObligatorio,
  ResumenErrores,
  type ErrorResumen,
} from '../../../components/ui/CampoFormulario'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector from '../../../components/ui/Selector'
import SelectorBuscable from '../../../components/ui/SelectorBuscable'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import { puedeRegistrarProveedoresYContratos } from '../../../config/permisosMaestros'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarProveedoresMaestro, registrarContrato } from '../../../services/api/maestrosTercerizados'
import { listarTiposServicio, listarTodo } from '../../../services/api/tercerizados'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import type { ProveedorMaestro } from '../../../types/maestrosTercerizados'
import { hoyLima } from '../../../utils/instanteLima'
import {
  BORRADOR_CONTRATO_VACIO,
  construirContrato,
  hayErrores,
  validarContrato,
  type BorradorContrato,
  type ErroresContrato,
} from '../../../utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar contrato'

const IDS = {
  proveedor: 'contrato-proveedor',
  tipoServicio: 'contrato-tipo-servicio',
  area: 'contrato-area',
  monto: 'contrato-monto',
  frecuencia: 'contrato-frecuencia',
  inicio: 'contrato-inicio',
  fin: 'contrato-fin',
} as const
const ORDEN: (keyof ErroresContrato)[] = ['proveedor', 'tipoServicio', 'area', 'monto', 'frecuencia', 'inicio', 'fin']

export default function ContratoNuevoPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.proveedoresContratos, { texto: 'Registrar contrato' }])
  const { estado: sesion } = useSesionTercerizados()
  const rol = sesion.tipo === 'activa' ? sesion.usuario.rol : null
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorContrato>(BORRADOR_CONTRATO_VACIO)
  // Tras el primer intento de confirmar, los errores se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  // Solo los servicios que ejecuta un tercero admiten contrato (regla de RF-SER-003).
  const servicios = useConsulta('tipos-servicio-activos', (signal) =>
    listarTodo((page) => listarTiposServicio({ activo: true, page }, signal)),
  )
  const opcionesServicio = [
    { valor: '', texto: 'Selecciona el tipo de servicio' },
    ...(servicios.datos?.resultados ?? [])
      .filter((t) => t.ejecutor === 'Tercerizado')
      .map((t) => ({ valor: String(t.id), texto: t.nombre })),
  ]

  if (!puedeRegistrarProveedoresYContratos(rol)) {
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
  const resumen: ErrorResumen[] = ORDEN.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS[clave],
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
    const primero = ORDEN.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creado = await registrarContrato(construirContrato(borrador))
      navegar(`${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`, {
        replace: true,
        state: { aviso: `Contrato ${creado.numero} registrado.` } satisfies EstadoNavegacionMaestros,
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

      <section className={estilos.grupo} aria-labelledby="titulo-proveedor-servicio">
        <h2 id="titulo-proveedor-servicio" className={estilos.tituloGrupo}>
          Proveedor y servicio
        </h2>
        <div className={estilos.cuadricula}>
          <SelectorBuscable<ProveedorMaestro>
            id={IDS.proveedor}
            etiqueta="Proveedor"
            obligatorio
            ayuda="Solo proveedores habilitados"
            error={errores.proveedor}
            valor={borrador.proveedor}
            claveDe={(p) => p.id}
            textoDe={(p) => p.razon_social}
            detalleDe={(p) => (p.ruc ? `RUC ${p.ruc}` : 'Sin RUC')}
            buscar={(q, signal) => listarProveedoresMaestro({ q: q || undefined, activo: true }, 1, signal)}
            onCambiar={(proveedor) => cambiar({ proveedor })}
          />
          <Selector
            id={IDS.tipoServicio}
            etiqueta="Tipo de servicio"
            obligatorio
            ayuda="Solo servicios que ejecuta un tercero"
            valor={borrador.tipoServicioId}
            opciones={opcionesServicio}
            error={errores.tipoServicio}
            bloqueadoMotivo={
              servicios.estado === 'error'
                ? 'No se pudieron cargar los tipos de servicio. Recarga la página para reintentar'
                : undefined
            }
            onCambiar={(valor) => cambiar({ tipoServicioId: valor })}
          />
          <CampoFormulario
            id={IDS.area}
            etiqueta="Área o metrado estimado"
            obligatorio
            maxLength={120}
            ayuda="Por ejemplo, 120 ejemplares o 3 500 m²"
            value={borrador.area}
            onChange={(e) => cambiar({ area: e.target.value })}
            error={errores.area}
          />
        </div>
      </section>

      <section className={estilos.grupo} aria-labelledby="titulo-costo">
        <h2 id="titulo-costo" className={estilos.tituloGrupo}>
          Costo, vigencia y condiciones
        </h2>
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS.monto}
            etiqueta="Monto fijo (S/)"
            obligatorio
            inputMode="decimal"
            ayuda="Por ejemplo, 12 000,00"
            value={borrador.monto}
            onChange={(e) => cambiar({ monto: e.target.value })}
            error={errores.monto}
          />
          <CampoFormulario
            id={IDS.frecuencia}
            etiqueta="Frecuencia pactada"
            obligatorio
            maxLength={120}
            ayuda="Por ejemplo, 4 al año"
            value={borrador.frecuencia}
            onChange={(e) => cambiar({ frecuencia: e.target.value })}
            error={errores.frecuencia}
          />
          <CampoFormulario
            id={IDS.inicio}
            etiqueta="Inicio de la vigencia"
            obligatorio
            ayuda="Primer día del contrato"
            type="date"
            value={borrador.inicio}
            onChange={(e) => cambiar({ inicio: e.target.value })}
            error={errores.inicio}
          />
          <CampoFormulario
            id={IDS.fin}
            etiqueta="Fin de la vigencia"
            obligatorio
            ayuda="Último día del contrato"
            type="date"
            value={borrador.fin}
            onChange={(e) => cambiar({ fin: e.target.value })}
            error={errores.fin}
          />
        </div>
        {vencido && (
          <AvisoEnLinea tono="advertencia" titulo="La vigencia ya terminó">
            El contrato se conservará como histórico y no se podrá usar en nuevas atenciones.
          </AvisoEnLinea>
        )}
        <AreaTexto
          id="contrato-condiciones"
          etiqueta="Condiciones (opcional)"
          rows={3}
          ayuda="Condiciones principales del contrato"
          value={borrador.condiciones}
          onChange={(e) => cambiar({ condiciones: e.target.value })}
        />
      </section>

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
        <BotonEnlace to={`${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
