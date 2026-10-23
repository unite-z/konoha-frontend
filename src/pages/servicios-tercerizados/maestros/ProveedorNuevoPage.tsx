// RF-SER-001 · Registrar un proveedor
/**
 * Registro de un proveedor de servicios tercerizados (Guía Web 5.3: formulario de una pantalla).
 *
 * - Solo el jefe de sección registra proveedores (el back-end lo vuelve a comprobar).
 * - Razón social y RUC obligatorios; contacto y vínculo con otras empresas opcionales. «Subsidiaria» y
 *   «Vinculada» piden el proveedor con el que se vinculan.
 * - RUC ya registrado: el servidor responde 409 y la pantalla ofrece abrir el proveedor existente.
 * - Si falla el guardado no se crea ningún registro parcial (el servidor lo registra todo en una transacción).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector from '../../../components/ui/Selector'
import SelectorBuscable from '../../../components/ui/SelectorBuscable'
import { puedeRegistrarProveedoresYContratos } from '../../../config/permisosMaestros'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarProveedoresMaestro, registrarProveedor } from '../../../services/api/maestrosTercerizados'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import type { ProveedorMaestro, TipoVinculo } from '../../../types/maestrosTercerizados'
import {
  BORRADOR_PROVEEDOR_VACIO,
  OPCIONES_VINCULO,
  construirProveedor,
  hayErrores,
  requiereRelacionado,
  validarProveedor,
  type BorradorProveedor,
  type ErroresProveedor,
} from '../../../utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar proveedor'

const IDS = { razonSocial: 'proveedor-razon-social', ruc: 'proveedor-ruc', relacionado: 'proveedor-relacionado' } as const
const ORDEN: (keyof ErroresProveedor)[] = ['razonSocial', 'ruc', 'relacionado']

export default function ProveedorNuevoPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.proveedoresContratos, { texto: 'Registrar proveedor' }])
  const { estado: sesion } = useSesionTercerizados()
  const rol = sesion.tipo === 'activa' ? sesion.usuario.rol : null
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
  const resumen: ErrorResumen[] = ORDEN.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS[clave],
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
    const primero = ORDEN.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS[primero])
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

      <section className={estilos.grupo} aria-labelledby="titulo-datos-proveedor">
        <h2 id="titulo-datos-proveedor" className={estilos.tituloGrupo}>
          Datos del proveedor
        </h2>
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS.razonSocial}
            etiqueta="Razón social"
            obligatorio
            maxLength={200}
            ayuda="Nombre legal de la empresa"
            value={borrador.razonSocial}
            onChange={(e) => cambiar({ razonSocial: e.target.value })}
            error={errores.razonSocial}
          />
          <CampoFormulario
            id={IDS.ruc}
            etiqueta="RUC"
            obligatorio
            inputMode="numeric"
            maxLength={11}
            ayuda="11 dígitos"
            value={borrador.ruc}
            onChange={(e) => cambiar({ ruc: e.target.value })}
            error={errores.ruc}
          />
          <CampoFormulario
            id="proveedor-contacto"
            etiqueta="Contacto (opcional)"
            maxLength={200}
            ayuda="Nombre y teléfono de la persona de contacto"
            value={borrador.contacto}
            onChange={(e) => cambiar({ contacto: e.target.value })}
          />
        </div>
      </section>

      <section className={estilos.grupo} aria-labelledby="titulo-vinculo">
        <h2 id="titulo-vinculo" className={estilos.tituloGrupo}>
          Vínculo con otras empresas
        </h2>
        <div className={estilos.cuadricula}>
          <Selector
            id="proveedor-vinculo"
            etiqueta="Tipo de vínculo"
            ayuda="Empresa principal, subsidiaria o vinculada con otro proveedor"
            valor={borrador.tipoVinculo}
            opciones={OPCIONES_VINCULO.map((o) => ({ valor: o.valor, texto: o.texto }))}
            onCambiar={(valor) =>
              cambiar({
                tipoVinculo: valor as TipoVinculo,
                relacionado: requiereRelacionado(valor as TipoVinculo) ? borrador.relacionado : null,
              })
            }
          />
          {requiereRelacionado(borrador.tipoVinculo) && (
            <SelectorBuscable<ProveedorMaestro>
              id={IDS.relacionado}
              etiqueta="Proveedor relacionado"
              obligatorio
              ayuda="Empresa principal con la que se vincula"
              error={errores.relacionado}
              valor={borrador.relacionado}
              claveDe={(p) => p.id}
              textoDe={(p) => p.razon_social}
              detalleDe={(p) => (p.ruc ? `RUC ${p.ruc}` : 'Sin RUC')}
              buscar={(q, signal) => listarProveedoresMaestro({ q: q || undefined, activo: true }, 1, signal)}
              onCambiar={(relacionado) => cambiar({ relacionado })}
            />
          )}
        </div>
      </section>

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
