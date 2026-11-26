/**
 * Proveedores (RD-49): contratos con su avance y el panel de cada contrato. Fondo liso, sin mapa. La cabecera de la
 * página no se mueve en las transiciones; la fila del contrato crece hasta ser su panel (`?contrato=<id>`).
 */
import { useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { estiloTransicion, nombresTransicion, transicionar, useFocoConLaVista } from '../base/movimiento'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { useParametroPanel } from '../base/PanelLateral/useParametroPanel'
import Bandeja from './Atenciones/Bandeja'
import { puedeConsultarAtenciones } from './Atenciones/permisos'
import { conCambios } from './Contratos/filtros'
import ListaContratos from './Contratos/ListaContratos'
import PanelContrato from './Contratos/PanelContrato'
import PanelFormulario from './Contratos/PanelFormulario'
import estilos from './Contratos/Contratos.module.css'
import { PARAM_CONTRATO, PARAM_EDITAR, rutaAtenciones, VALOR_CONTRATO_NUEVO } from './enlaces'
import { puedeConsultarContratos, puedeGestionarContratos, puedeVerMontos } from './permisos'

function PanelAviso({
  onCerrar,
  titulo,
  children,
}: {
  onCerrar: () => void
  titulo: string
  children: React.ReactNode
}) {
  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={titulo}>
      {children}
    </PanelLateral>
  )
}

export default function ProveedoresPage() {
  const permisos = usePermisos()
  const [parametros, setParametros] = useSearchParams()
  const { state } = useLocation()
  const panel = useParametroPanel(PARAM_CONTRATO)
  const [version, setVersion] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()

  const puedeGestionar = puedeGestionarContratos(permisos)
  const editando = parametros.get(PARAM_EDITAR) === '1'
  const valor = panel.valor
  const id = valor !== null && /^\d{1,9}$/.test(valor) ? Number(valor) : null

  if (!puedeConsultarContratos(permisos)) {
    // Quien solo ve atenciones entra a Proveedores por su bandeja (como hoy en Servicios tercerizados).
    if (puedeConsultarAtenciones(permisos)) return <Navigate to={rutaAtenciones()} replace />
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No puedes ver los contratos"
          descripcion="Tu cuenta no tiene permiso para consultar contratos de proveedores."
        />
      </div>
    )
  }

  function cerrar() {
    if (parametros.has(PARAM_EDITAR))
      setParametros(
        conCambios(parametros, {
          [PARAM_CONTRATO]: null,
          [PARAM_EDITAR]: null,
        }),
        { replace: true },
      )
    else panel.cerrar()
  }

  function abrir(idContrato: number) {
    transicionar(() => panel.abrir(String(idContrato)))
  }

  function crear() {
    transicionar(() => panel.abrir(VALOR_CONTRATO_NUEVO))
  }

  function editar(activo: boolean) {
    transicionar(() =>
      setParametros(conCambios(parametros, { [PARAM_EDITAR]: activo ? '1' : null }), { replace: true, state }),
    )
  }

  function guardado(contrato: ContratoMaestro, creado: boolean) {
    setVersion((v) => v + 1)
    setAviso(creado ? `Contrato ${contrato.numero} registrado.` : `Contrato ${contrato.numero} actualizado.`)
    transicionar(() =>
      setParametros(
        conCambios(parametros, {
          [PARAM_CONTRATO]: String(contrato.id),
          [PARAM_EDITAR]: null,
        }),
        { replace: true, state },
      ),
    )
  }

  let panelAbierto = null
  if (valor === VALOR_CONTRATO_NUEVO) {
    panelAbierto = puedeGestionar ? (
      <PanelFormulario id={null} onCerrar={cerrar} onCancelar={cerrar} onGuardado={(c) => guardado(c, true)} />
    ) : (
      <PanelAviso titulo="Nuevo contrato" onCerrar={cerrar}>
        <EstadoSinAcceso
          nivel={3}
          titulo="Solo la jefatura de sección registra contratos"
          descripcion="Puedes consultar los contratos desde la lista."
        />
      </PanelAviso>
    )
  } else if (valor !== null && id === null) {
    panelAbierto = (
      <PanelAviso titulo="Contrato" onCerrar={cerrar}>
        <EstadoVacio nivel={3} titulo="No existe este contrato" descripcion="Revisa el enlace o búscalo en la lista." />
      </PanelAviso>
    )
  } else if (id !== null && editando && puedeGestionar) {
    panelAbierto = (
      <PanelFormulario
        key={`editar-${id}`}
        id={id}
        onCerrar={cerrar}
        onCancelar={() => editar(false)}
        onGuardado={(c) => guardado(c, false)}
      />
    )
  } else if (id !== null) {
    panelAbierto = (
      <PanelContrato
        key={id}
        id={id}
        onCerrar={cerrar}
        onEditar={() => editar(true)}
        verMontos={puedeVerMontos(permisos)}
        puedeEditar={puedeGestionar}
      />
    )
  }

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <div>
          <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
            Proveedores
          </h1>
          <p className={estilos.subtitulo}>Contratos de servicios tercerizados con su avance y verificación.</p>
        </div>
        {puedeGestionar && (
          <Boton variante="primario" icono="plus" onClick={crear}>
            Nuevo contrato
          </Boton>
        )}
      </header>

      <ListaContratos
        abierto={valor}
        onAbrir={abrir}
        verMontos={puedeVerMontos(permisos)}
        version={version}
        puedeCrear={puedeGestionar}
        onCrear={crear}
      />
      {puedeConsultarAtenciones(permisos) && <Bandeja modo="recientes" />}
      {panelAbierto}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
