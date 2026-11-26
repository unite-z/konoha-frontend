/** «Exportar Excel»: descarga el listado con los filtros que está viendo la bandeja. */
import { useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import { aErrorApi } from '@/services/api/cliente'
import { guardarArchivo } from '@/services/api/clienteReportesGestion'
import { exportarListado } from '@/services/api/core'
import type { FiltrosAtenciones } from '@/types/tercerizados'

export default function BotonExportar({ filtros }: { filtros: FiltrosAtenciones }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportar() {
    setCargando(true)
    setError(null)
    try {
      guardarArchivo(await exportarListado('atenciones', { ...filtros }), 'atenciones.xlsx')
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <Boton variante="secundario" icono="download" cargando={cargando} onClick={() => void exportar()}>
        Exportar Excel
      </Boton>
      <AvisoTemporal mensaje={error} tono="error" onCerrar={() => setError(null)} />
    </>
  )
}
