import { useRef, useState } from 'react'
import { Link } from 'react-router'
import Boton from '@/design-system/Boton'
import Casilla from '@/design-system/Casilla'
import AccionFila, { AccionesFila } from '@/design-system/AccionFila'
import TablaDatos, { type ColumnaTabla } from '@/design-system/TablaDatos'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useConsulta } from '@/hooks/useConsulta'
import { listarTiposRestriccion, modificarTipoRestriccion } from '@/services/api/planificacion'
import type { ResultadoTipoRestriccion, TipoRestriccion } from '@/types/planificacion'
import { rutaCiclo } from '@/router/rutasApp'
import PanelTipoRestriccion, { CONSECUENCIA_BAJA, EFECTOS_TIPO } from './PanelTipoRestriccion'

export default function TiposRestriccion({ puedeEditar }: { puedeEditar: boolean }) {
  const [incluir, setIncluir] = useState(false)
  const consulta = useConsulta(`catalogo-tipos:${incluir}`, (signal) => listarTiposRestriccion(signal, incluir))
  const [panel, setPanel] = useState<{ tipo: TipoRestriccion | null } | null>(null)
  const [baja, setBaja] = useState<TipoRestriccion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorBaja, setErrorBaja] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [afectados, setAfectados] = useState<ResultadoTipoRestriccion['ciclos_afectados']>([])
  const enCurso = useRef(false)
  function guardado(tipo: ResultadoTipoRestriccion) {
    setPanel(null)
    setAviso(`Tipo ${tipo.nombre} guardado.`)
    setAfectados(tipo.ciclos_afectados ?? [])
    consulta.reintentar()
  }
  async function desactivar() {
    if (!baja || enCurso.current) return
    enCurso.current = true
    setEnviando(true)
    setErrorBaja(null)
    try {
      const resultado = await modificarTipoRestriccion(baja.id, { activo: false })
      setBaja(null)
      guardado(resultado)
    } catch (causa) {
      setErrorBaja(causa instanceof Error ? causa.message : 'Inténtalo de nuevo.')
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }
  const columnas: ColumnaTabla<TipoRestriccion>[] = [
    {
      clave: 'nombre',
      titulo: 'Nombre',
      render: (t) => (
        <>
          {t.nombre}
          {(t.protegido || t.nombre === 'Cierre del campus') && <p>Protegido: planificación de poda mayor</p>}
        </>
      ),
    },
    {
      clave: 'efecto',
      titulo: 'Efecto',
      render: (t) => (
        <Estado
          tono={t.efecto === 'Prohibicion' ? 'error' : t.efecto === 'Advertencia' ? 'aviso' : 'exito'}
          texto={EFECTOS_TIPO.find((e) => e.valor === t.efecto)?.texto ?? t.efecto}
        />
      ),
    },
    { clave: 'ruidosos', titulo: 'Solo ruidosos', render: (t) => (t.aplica_servicios_ruidosos ? 'Sí' : 'No') },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (t) => (
        <Estado tono={t.activo === false ? 'neutro' : 'exito'} texto={t.activo === false ? 'Inactivo' : 'Activo'} />
      ),
    },
  ]
  if (puedeEditar)
    columnas.push({
      clave: 'acciones',
      titulo: 'Acciones',
      tituloOculto: true,
      render: (t) => (
        <AccionesFila>
          <AccionFila
            icono="pencil"
            nombre="Editar tipo"
            etiqueta={`Editar ${t.nombre}`}
            onClick={() => setPanel({ tipo: t })}
          />
          {t.activo !== false && (
            <AccionFila
              icono="circle-x"
              nombre="Desactivar tipo"
              etiqueta={`Desactivar ${t.nombre}`}
              tono="peligro"
              deshabilitado={t.protegido || t.nombre === 'Cierre del campus'}
              descripcion={
                t.protegido || t.nombre === 'Cierre del campus'
                  ? 'Tipo protegido para la planificación de poda mayor'
                  : undefined
              }
              onClick={() => {
                setErrorBaja(null)
                setBaja(t)
              }}
            />
          )}
        </AccionesFila>
      ),
    })
  if (consulta.error?.estado === 403) return <EstadoSinAcceso />
  return (
    <>
      {puedeEditar && (
        <AccionesPagina>
          <Boton variante="primario" onClick={() => setPanel({ tipo: null })}>
            Crear tipo
          </Boton>
        </AccionesPagina>
      )}
      <Casilla etiqueta="Incluir tipos inactivos" marcada={incluir} onCambiar={setIncluir} />
      {consulta.estado === 'error' && (
        <EstadoError
          titulo="No pudimos cargar los tipos"
          descripcion={consulta.error?.detalle ?? ''}
          onReintentar={consulta.reintentar}
        />
      )}
      {afectados.length > 0 && (
        <AvisoEnLinea
          tono="advertencia"
          titulo={
            afectados.length === 1 ? '1 ciclo requiere revisión' : `${afectados.length} ciclos requieren revisión`
          }
        >
          La prohibición afecta ciclos existentes. No se han cancelado ni reprogramado.
          <ul>
            {afectados.map((c) => (
              <li key={c.id}>
                {c.servicio} · {c.fecha_inicio_prevista}–{c.fecha_fin_prevista} ·{' '}
                <Link to={rutaCiclo(c.id)}>Revisar ciclo</Link>
              </li>
            ))}
          </ul>
        </AvisoEnLinea>
      )}
      <TablaDatos
        titulo="Tipos de restricción"
        columnas={columnas}
        filas={consulta.datos ?? []}
        claveFila={(t) => String(t.id)}
        estado={!consulta.datos ? 'cargando' : 'exito'}
        vacio={{ titulo: 'No hay tipos disponibles' }}
      />
      {puedeEditar && panel && (
        <PanelTipoRestriccion tipo={panel.tipo} onCerrar={() => setPanel(null)} onGuardado={guardado} />
      )}
      {puedeEditar && baja && (
        <DialogoConfirmacion
          abierto
          titulo={`Desactivar ${baja.nombre}`}
          consecuencia={CONSECUENCIA_BAJA}
          textoConfirmar="Desactivar tipo"
          variante="destructivo"
          cargando={enviando}
          onCancelar={() => setBaja(null)}
          onConfirmar={() => void desactivar()}
        >
          {errorBaja && (
            <AvisoEnLinea tono="error" titulo="No se pudo desactivar">
              {errorBaja}
            </AvisoEnLinea>
          )}
        </DialogoConfirmacion>
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </>
  )
}
