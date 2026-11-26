/**
 * Alta y edición de un contrato en el panel (RD-49, solo jefatura de sección). Reutiliza los campos y las validaciones
 * del formulario actual; el número lo asigna el servidor y un contrato con vigencia ya terminada se acepta como histórico.
 */
import { useRef, useState, type FormEvent } from 'react'
import Boton from '@/design-system/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import AvisoFallo from '@/pages/servicios-tercerizados/maestros/AvisoFallo'
import CamposContrato, { IDS_CONTRATO, ORDEN_CONTRATO } from '@/pages/servicios-tercerizados/maestros/CamposContrato'
import { enfocar, interpretarFallo, type FalloRegistro } from '@/pages/servicios-tercerizados/maestros/fallosRegistro'
import { editarContrato, obtenerContrato, registrarContrato } from '@/services/api/maestrosTercerizados'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { hoyLima } from '@/utils/instanteLima'
import {
  BORRADOR_CONTRATO_VACIO,
  borradorDeContrato,
  construirContrato,
  hayErrores,
  validarContrato,
  type BorradorContrato,
} from '@/utils/validacionMaestros'
import { panel } from '@/rediseno/base/movimiento'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import estilos from './Contratos.module.css'

const ID_FORMULARIO = 'formulario-contrato'

export interface PanelFormularioProps {
  /** Contrato que se edita; `null` para el alta. */
  id: number | null
  /** Cierra el panel (con la X). */
  onCerrar: () => void
  /** «Cancelar»: en el alta cierra el panel; en la edición vuelve al contrato. */
  onCancelar: () => void
  onGuardado: (contrato: ContratoMaestro) => void
}

interface EdicionProps extends PanelFormularioProps {
  inicial: BorradorContrato
  titulo: string
}

function Edicion({ id, inicial, titulo, onCerrar, onCancelar, onGuardado }: EdicionProps) {
  const [borrador, setBorrador] = useState(inicial)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

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

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
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
      const entrada = construirContrato(borrador)
      onGuardado(id === null ? await registrarContrato(entrada) : await editarContrato(id, entrada))
    } catch (causa) {
      setFallo(interpretarFallo(causa, id === null ? 'registrar el contrato' : 'editar el contrato'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <PanelLateral
      abierto
      editando
      onCerrar={onCerrar}
      titulo={titulo}
      viewTransitionName={id === null ? undefined : panel(id)}
      pie={
        <>
          <Boton variante="secundario" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            form={ID_FORMULARIO}
            variante="primario"
            cargando={enviando}
            deshabilitado={intentado && hayErrores(errores)}
            ayudaDeshabilitado="Corrige los campos marcados para poder guardar"
            onClickDeshabilitado={() => void guardar()}
          >
            {id === null ? 'Crear contrato' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      <form
        id={ID_FORMULARIO}
        className={estilos.formulario}
        onSubmit={guardar}
        noValidate
        aria-label={id === null ? 'Nuevo contrato' : 'Editar contrato'}
      >
        <LeyendaObligatorio />
        <ResumenErrores
          titulo={`Falta información: revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`}
          errores={resumen}
        />
        <CamposContrato borrador={borrador} errores={errores} vencido={vencido} onCambiar={cambiar} />
        {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void guardar()} />}
      </form>
    </PanelLateral>
  )
}

export default function PanelFormulario(props: PanelFormularioProps) {
  const { id, onCerrar } = props
  const consulta = useConsulta(id === null ? null : `rd49-contrato-editar|${id}`, (signal) =>
    obtenerContrato(id as number, signal),
  )

  if (id === null) return <Edicion {...props} inicial={BORRADOR_CONTRATO_VACIO} titulo="Nuevo contrato" />
  if (consulta.datos) {
    return (
      <Edicion
        {...props}
        key={consulta.datos.id}
        inicial={borradorDeContrato(consulta.datos)}
        titulo={`Editar ${consulta.datos.numero}`}
      />
    )
  }
  const contenido =
    consulta.estado === 'error' && consulta.error?.estado === 404 ? (
      <EstadoVacio nivel={3} titulo="No existe este contrato" descripcion="Revisa el enlace o búscalo en la lista." />
    ) : consulta.estado === 'error' ? (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el contrato"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    ) : (
      <EstadoCarga forma="pagina" texto="Cargando el contrato…" />
    )
  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo="Editar contrato" viewTransitionName={panel(id)}>
      {contenido}
    </PanelLateral>
  )
}
