import { useEffect, useMemo } from 'react'

/** Dirección temporal para mostrar una foto; sin `URL.createObjectURL` (por ejemplo en las pruebas) no hay vista previa. */
export function useVistaPrevia(foto: Blob | null): string | null {
  const url = useMemo(
    () => (foto && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(foto) : null),
    [foto],
  )
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])
  return url
}
