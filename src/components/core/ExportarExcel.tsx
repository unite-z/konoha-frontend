/**
 * Botón «Exportar a Excel» de los listados (RF-T-011, HU-MOD01-013). Descarga el `.xlsx` que genera el backend, que
 * solo incluye datos autorizados y no modifica nada. Sin el permiso de consulta de la entidad no se muestra; el
 * servidor vuelve a comprobarlo y un rechazo se avisa sin salir de la pantalla.
 */
import { useState } from 'react'
import Boton from '../ui/Boton'
import AvisoTemporal from '../ui/AvisoTemporal'
import { PERMISOS, puede } from '@/config/permisosCore'
import { aErrorApi } from '@/services/api/cliente'
import { guardarArchivo } from '@/services/api/clienteReportesGestion'
import { exportarListado, type ListadoExportable } from '@/services/api/core'
import { useSesionActiva } from '@/sesion/ContextoSesion'

const PERMISO_DE_LISTADO: Record<ListadoExportable, string> = {
  actividades: PERMISOS.consultarPartes,
  atenciones: PERMISOS.registrarAtencion,
  ejemplares: PERMISOS.consultarInventario,
}

export default function ExportarExcel({ listado }: { listado: ListadoExportable }) {
  const sesion = useSesionActiva()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!puede(sesion, PERMISO_DE_LISTADO[listado])) return null

  async function exportar() {
    setCargando(true)
    setError(null)
    try {
      guardarArchivo(await exportarListado(listado), `${listado}.xlsx`)
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <Boton variante="secundario" icono="download" cargando={cargando} onClick={() => void exportar()}>
        Exportar a Excel
      </Boton>
      <AvisoTemporal mensaje={error} tono="error" onCerrar={() => setError(null)} />
    </>
  )
}
