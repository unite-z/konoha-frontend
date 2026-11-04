// HU-024 y HU-027 · Bandeja de incidencias del jefe (AV-283, Figma «Bandeja» 388-7027)
/**
 * Pestañas por grupo de estado con contador y tabla con incidencia, ubicación, severidad, vía, estado y tiempo
 * abierta (en tono de aviso si una sencilla pasa el plazo objetivo de 24 h, RN-019). Los datos son simulados
 * hasta que exista el backend (AV-274 y AV-280). Encima, la tarjeta de alertas de plazo de las sencillas con «Reasignar»
 * y «Anotar causa» (`AlertasPlazo`, Figma 394-9392). «Reportar incidencia» abre el registro en nombre de otro
 * (`DialogoRegistrarIncidencia`, Figma 394-8504, AV-285).
 */
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton from '@/components/ui/Boton'
import { CeldaDobleLinea, CeldaTexto } from '@/components/ui/CeldasTabla'
import Estado from '@/components/ui/Estado'
import EstadoError from '@/components/ui/EstadoError'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INCIDENCIAS, rutaIncidencia } from '@/router/rutasApp'
import { listarIncidencias } from '@/services/api/incidencias'
import type { IncidenciaResumen } from '@/types/incidencias'
import AlertasPlazo from './AlertasPlazo'
import DialogoRegistrarIncidencia from './DialogoRegistrarIncidencia'
import estilos from './Incidencias.module.css'
import {
  ESTADO_INCIDENCIA,
  PESTANAS_BANDEJA,
  alertasPlazo,
  SEVERIDAD_INCIDENCIA,
  VIA_INCIDENCIA,
  contadoresBandeja,
  horasAbierta,
  incidenciasDePestana,
  superaObjetivo,
  textoTiempoAbierta,
  type PestanaBandeja,
} from './bandeja'

export default function BandejaIncidenciasPage() {
  usePaginaActual('Incidencias', [MIGAS_INCIDENCIAS.incidencias, { texto: 'Bandeja' }])
  const [pestana, setPestana] = useState<PestanaBandeja>('todas')
  const consulta = useConsulta('incidencias', (signal) => listarIncidencias(signal))
  const [ahora] = useState(() => Date.now())
  // Reasignaciones hechas aquí, encima de la consulta hasta la siguiente.
  const [locales, setLocales] = useState<Record<number, IncidenciaResumen>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const navegar = useNavigate()
  const [registrando, setRegistrando] = useState(false)

  const columnas: ColumnaTabla<IncidenciaResumen>[] = [
    { clave: 'incidencia', titulo: 'Incidencia', multilinea: true, render: (i) => <CeldaDobleLinea principal={i.tipo} detalle={i.codigo} codigo /> },
    { clave: 'ubicacion', titulo: 'Ubicación', multilinea: true, render: (i) => <CeldaTexto texto={i.espacio} tono="secundario" /> },
    {
      clave: 'severidad',
      titulo: 'Severidad',
      render: (i) => {
        if (!i.severidad) return <CeldaTexto texto="Sin clasificar" tono="deshabilitado" />
        const severidad = SEVERIDAD_INCIDENCIA[i.severidad]
        return <Estado tono={severidad.tono} texto={severidad.texto} punto />
      },
    },
    { clave: 'via', titulo: 'Vía', render: (i) => <CeldaTexto texto={i.via ? VIA_INCIDENCIA[i.via] : null} /> },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (i) => {
        const estado = ESTADO_INCIDENCIA[i.estado]
        // Como en Figma, «En atención» va relleno y sin punto.
        return <Estado tono={estado.tono} texto={estado.texto} punto={i.estado !== 'EnAtencion'} />
      },
    },
    {
      clave: 'abierta',
      titulo: 'Abierta',
      render: (i) => {
        const horas = horasAbierta(i, ahora)
        return <CeldaTexto texto={textoTiempoAbierta(horas)} tono={superaObjetivo(i, horas) ? 'aviso' : 'secundario'} />
      },
    },
  ]

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las incidencias" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }

  const incidencias = (consulta.datos ?? []).map((i) => locales[i.id] ?? i)
  const contadores = contadoresBandeja(incidencias)
  return (
    <div className={estilos.pagina}>
      <AccionesPagina>
        <Boton icono="plus-circle" onClick={() => setRegistrando(true)}>
          Reportar incidencia
        </Boton>
      </AccionesPagina>
      <AvisoDatosSimulados />
      <AlertasPlazo
        alertas={alertasPlazo(incidencias, ahora)}
        onAviso={setAviso}
        onReasignada={(actualizada) => setLocales((previas) => ({ ...previas, [actualizada.id]: actualizada }))}
      />
      <Pestanas
        etiqueta="Estado de las incidencias"
        pestanas={PESTANAS_BANDEJA.map((p) => ({ ...p, contador: consulta.datos ? contadores[p.valor] : undefined }))}
        valor={pestana}
        onCambiar={(valor) => setPestana(valor as PestanaBandeja)}
      >
        <TablaDatos
          titulo="Incidencias"
          columnas={columnas}
          filas={incidenciasDePestana(incidencias, pestana)}
          claveFila={(i) => String(i.id)}
          onFilaClick={(i) => navegar(rutaIncidencia(i.id))}
          estado={consulta.datos ? 'exito' : 'cargando'}
          vacio={{ titulo: 'Sin incidencias en esta pestaña', descripcion: 'Las incidencias reportadas aparecerán aquí.' }}
        />
      </Pestanas>
      {registrando && (
        <DialogoRegistrarIncidencia
          onCerrar={() => setRegistrando(false)}
          onRegistrada={(registrada) => {
            setRegistrando(false)
            setAviso(`${registrada.codigo} registrada`)
            consulta.reintentar()
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
