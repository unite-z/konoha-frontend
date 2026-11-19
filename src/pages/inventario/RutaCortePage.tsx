/**
 * Ruta de jardines del corte de césped (AV-129, RF-INV-004, HU-MOD02-009). La ruta son los jardines de los sectores
 * ordinarios menos los retirados: la que MOD-03 copia al programar un ciclo. Retirar pide motivo y fecha (desde ese
 * día los ciclos ya no copian el jardín); reincorporar cierra el retiro. Nada se borra: queda el historial.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import TablaDatos, { type ColumnaTabla } from '@/design-system/TablaDatos'
import Tarjeta from '@/design-system/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import {
  listarRetirosRutaCorte,
  obtenerRutaCorte,
  reincorporarJardinRutaCorte,
  retirarJardinRutaCorte,
} from '@/services/api/rutaCorte'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { JardinRutaCorte, RetiroRutaCorte } from '@/types/rutaCorte'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './CampanasPoda.module.css'

type Accion = { tipo: 'retirar'; jardin: JardinRutaCorte } | { tipo: 'reincorporar'; jardin: JardinRutaCorte }

const metros = (valor: string) => `${formatearNumero(Number(valor), 2)} m²`

function estadoJardin(jardin: JardinRutaCorte) {
  if (jardin.en_ruta && jardin.retiro)
    return <Estado tono="aviso" texto={`Sale el ${formatearFecha(jardin.retiro.desde)}`} />
  if (jardin.en_ruta) return <Estado tono="exito" texto="En la ruta" />
  return <Estado tono="neutro" texto="Retirado" />
}

export default function RutaCortePage() {
  usePaginaActual('Ruta de corte', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Ruta de corte' }])
  const sesion = useSesionActiva()
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)
  const [fecha, setFecha] = useState(hoyLima())
  const [version, setVersion] = useState(0)
  const ruta = useConsulta(`ruta-corte|${fecha}|${version}`, (signal) => obtenerRutaCorte(fecha, signal))
  const retiros = useConsulta(`ruta-corte-retiros|${version}`, listarRetirosRutaCorte)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [desde, setDesde] = useState(hoyLima())
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (ruta.error?.estado === 403) return <EstadoSinAcceso descripcion={ruta.error.detalle} />
  if (ruta.estado === 'error' && !ruta.datos) {
    return (
      <EstadoError
        titulo="No pudimos cargar la ruta de corte"
        descripcion={ruta.error?.detalle ?? ''}
        onReintentar={ruta.reintentar}
      />
    )
  }
  if (!ruta.datos) return <EstadoCarga forma="tabla" texto="Cargando la ruta de corte…" retrasar />

  const ordinarios = ruta.datos.jardines.filter((j) => !j.a_demanda)
  const aDemanda = ruta.datos.jardines.filter((j) => j.a_demanda)

  function abrir(nueva: Accion) {
    setAccion(nueva)
    setDesde(hoyLima())
    setMotivo('')
    setError(null)
  }

  async function confirmar() {
    if (!accion) return
    if (!motivo.trim()) {
      setError(accion.tipo === 'retirar' ? 'Escribe el motivo del retiro.' : 'Escribe el motivo de la reincorporación.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const entrada = { desde, motivo: motivo.trim() }
      if (accion.tipo === 'retirar') {
        await retirarJardinRutaCorte({ area_verde_id: accion.jardin.area_verde_id, ...entrada })
        setAviso(`${accion.jardin.nombre} sale de la ruta desde el ${formatearFecha(desde)}.`)
      } else if (accion.jardin.retiro) {
        await reincorporarJardinRutaCorte(accion.jardin.retiro.id, entrada)
        setAviso(`${accion.jardin.nombre} vuelve a la ruta desde el ${formatearFecha(desde)}.`)
      }
      setAccion(null)
      setVersion((actual) => actual + 1)
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  const columnas: ColumnaTabla<JardinRutaCorte>[] = [
    { clave: 'nombre', titulo: 'Jardín', ordenable: true },
    { clave: 'sector', titulo: 'Sector', ordenable: true },
    {
      clave: 'superficie_m2',
      titulo: 'Superficie',
      alineacion: 'derecha',
      render: (j) => <span className="cifra">{metros(j.superficie_m2)}</span>,
    },
    { clave: 'en_ruta', titulo: 'Estado', render: estadoJardin },
    {
      clave: 'retiro',
      titulo: 'Motivo del retiro',
      render: (j) => (j.retiro ? `${j.retiro.motivo} (desde el ${formatearFecha(j.retiro.desde)})` : '—'),
    },
  ]
  if (puedeGestionar) {
    columnas.push({
      clave: 'accion',
      titulo: 'Acción',
      tituloOculto: true,
      render: (j) =>
        j.retiro ? (
          <Boton variante="secundario" compacto onClick={() => abrir({ tipo: 'reincorporar', jardin: j })}>
            Reincorporar
          </Boton>
        ) : (
          <Boton variante="fantasma" compacto onClick={() => abrir({ tipo: 'retirar', jardin: j })}>
            Retirar
          </Boton>
        ),
    })
  }

  const columnasHistorial: ColumnaTabla<RetiroRutaCorte>[] = [
    { clave: 'area_verde_nombre', titulo: 'Jardín' },
    { clave: 'desde', titulo: 'Retirado desde', render: (r) => formatearFecha(r.desde) },
    { clave: 'motivo', titulo: 'Motivo' },
    { clave: 'autor', titulo: 'Registró' },
    {
      clave: 'reincorporado_desde',
      titulo: 'Reincorporado',
      render: (r) =>
        r.reincorporado_desde
          ? `Desde el ${formatearFecha(r.reincorporado_desde)}: ${r.motivo_reincorporacion ?? ''} (${r.autor_reincorporacion ?? ''})`
          : '—',
    },
  ]

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>
        Jardines que se cortan en cada ciclo. Al programar un corte, Planificación copia esta ruta tal como está el día
        que empieza el ciclo.
      </p>
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}

      <Tarjeta
        titulo="Resumen de la ruta"
        junto={<Estado tono="info" texto={`${ruta.datos.total_jardines} jardines`} />}
        relleno="amplio"
      >
        <div className={estilos.busqueda}>
          <CampoFormulario
            id="fecha-ruta-corte"
            etiqueta="Ruta para los ciclos que empiezan el"
            type="date"
            value={fecha}
            onChange={(evento) => evento.target.value && setFecha(evento.target.value)}
          />
        </div>
        <p className={estilos.resumen}>
          {ruta.datos.total_jardines} jardines en la ruta · superficie total{' '}
          <span className="cifra">{metros(ruta.datos.superficie_total_m2)}</span>
        </p>
      </Tarjeta>

      <TablaDatos
        titulo="Jardines de la ruta"
        tituloVisible
        columnas={columnas}
        filas={ordinarios}
        claveFila={(j) => String(j.area_verde_id)}
        vacio={{
          titulo: 'Sin jardines en sectores ordinarios',
          descripcion: 'Asigna las áreas verdes a un sector en Catálogos y sectores.',
        }}
      />

      {aDemanda.length > 0 && (
        <TablaDatos
          titulo="Fuera de la ruta: sectores a demanda"
          tituloVisible
          columnas={columnas.slice(0, 3)}
          filas={aDemanda}
          claveFila={(j) => String(j.area_verde_id)}
        />
      )}

      <TablaDatos
        titulo="Historial de retiros"
        tituloVisible
        columnas={columnasHistorial}
        filas={retiros.datos ?? []}
        claveFila={(r) => String(r.id)}
        estado={retiros.estado === 'error' ? 'error' : retiros.datos ? 'exito' : 'cargando'}
        error={{
          titulo: 'No pudimos cargar el historial',
          descripcion: retiros.error?.detalle ?? '',
          onReintentar: retiros.reintentar,
        }}
        vacio={{ titulo: 'Sin retiros', descripcion: 'Ningún jardín ha salido de la ruta.' }}
      />

      {accion && (
        <DialogoConfirmacion
          abierto
          titulo={
            accion.tipo === 'retirar'
              ? `Retirar «${accion.jardin.nombre}» de la ruta`
              : `Reincorporar «${accion.jardin.nombre}» a la ruta`
          }
          consecuencia={
            accion.tipo === 'retirar'
              ? 'Los ciclos que empiecen desde esa fecha no lo cortarán. Los ya programados no cambian.'
              : 'Los ciclos que empiecen desde esa fecha volverán a cortarlo.'
          }
          textoConfirmar={accion.tipo === 'retirar' ? 'Retirar' : 'Reincorporar'}
          variante={accion.tipo === 'retirar' ? 'destructivo' : 'primario'}
          cargando={guardando}
          onConfirmar={() => void confirmar()}
          onCancelar={() => setAccion(null)}
        >
          <CampoFormulario
            id="desde-ruta-corte"
            etiqueta="Desde"
            type="date"
            min={hoyLima()}
            required
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
          />
          <AreaTexto
            id="motivo-ruta-corte"
            etiqueta="Motivo"
            maxLength={300}
            required
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
          {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        </DialogoConfirmacion>
      )}
    </div>
  )
}
