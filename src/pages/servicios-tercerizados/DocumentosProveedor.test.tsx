// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, DocumentoReporte, ReporteProveedor } from '@/types/tercerizados'
import DocumentosProveedor from './DocumentosProveedor'

const listarReportes = vi.fn()
const descargarDocumento = vi.fn()
vi.mock('@/services/api/tercerizados', () => ({
  listarReportes: (...argumentos: unknown[]) => listarReportes(...argumentos),
  descargarDocumento: (...argumentos: unknown[]) => descargarDocumento(...argumentos),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const atencion = {
  id: 9,
  estado: 'Reporte adjunto',
  alcances: [{ id: 4, area_verde_id: 1, area_verde_nombre: 'Jardín A', ejemplar_id: null, ejemplar_codigo: null }],
} as unknown as Atencion

function documento(id: number, categoria: DocumentoReporte['categoria'], nombre: string, alcance: number | null = null): DocumentoReporte {
  return {
    id,
    categoria,
    alcance_id: alcance,
    descripcion: '',
    archivo: { id, nombre_original: nombre, tipo_mime: 'application/pdf', tamano_bytes: 2048, hash_contenido: 'a'.repeat(64) },
  }
}

function revision(id: number, numero: number, documentos: DocumentoReporte[]): ReporteProveedor {
  return {
    id,
    atencion_id: 9,
    revision: numero,
    fecha_recepcion: '2026-01-03',
    resumen: '',
    documentos,
    usuario_creacion_id: 1,
    usuario_creacion_nombre: 'Jefe de sección',
    fecha_creacion: '2026-01-03T09:00:00-05:00',
  }
}

describe('DocumentosProveedor', () => {
  it('muestra la revisión más reciente como vigente y conserva las anteriores', async () => {
    listarReportes.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        revision(71, 2, [documento(2, 'InformeFinal', 'informe-v2.pdf')]),
        revision(70, 1, [documento(1, 'InformeFinal', 'informe-v1.pdf')]),
      ],
    })

    render(<DocumentosProveedor atencion={atencion} />)

    const segunda = await screen.findByRole('article', { name: /Revisión 2/ })
    const primera = screen.getByRole('article', { name: /Revisión 1/ })
    expect(within(segunda).getByText('Vigente')).toBeTruthy()
    expect(within(primera).getByText('Anterior')).toBeTruthy()
    expect(within(segunda).getByText('informe-v2.pdf')).toBeTruthy()
    expect(within(primera).getByText('informe-v1.pdf')).toBeTruthy()
    expect(screen.getByText('2 revisiones')).toBeTruthy()
  })

  it('muestra la categoría y el espacio de cada documento', async () => {
    listarReportes.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [revision(70, 1, [documento(1, 'InformeFinal', 'informe.pdf'), documento(2, 'EvidenciaEspacio', 'jardin.pdf', 4)])],
    })

    render(<DocumentosProveedor atencion={atencion} />)

    expect(await screen.findByText('Informe final')).toBeTruthy()
    expect(screen.getByText('Evidencia por espacio')).toBeTruthy()
    expect(screen.getByText(/Jardín A/)).toBeTruthy()
  })

  it('descarga un documento con los identificadores de su atención, revisión y documento', async () => {
    listarReportes.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [revision(70, 1, [documento(5, 'InformeFinal', 'informe.pdf')])],
    })
    descargarDocumento.mockResolvedValue(undefined)
    render(<DocumentosProveedor atencion={atencion} />)
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Descargar informe.pdf' }))

    await waitFor(() => expect(descargarDocumento).toHaveBeenCalledWith(9, 70, 5, 'informe.pdf'))
  })

  it('si la descarga falla, lo informa sin perder la lista', async () => {
    listarReportes.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [revision(70, 1, [documento(5, 'InformeFinal', 'informe.pdf')])],
    })
    descargarDocumento.mockRejectedValue(new ErrorApi(404, 'NoEncontrado', 'El archivo no está disponible en el almacenamiento'))
    render(<DocumentosProveedor atencion={atencion} />)
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Descargar informe.pdf' }))

    expect(await screen.findByText('No se pudo descargar «informe.pdf»')).toBeTruthy()
    expect(screen.getByText('El archivo no está disponible en el almacenamiento')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descargar informe.pdf' })).toBeTruthy()
  })

  it('sin revisiones muestra el estado vacío', async () => {
    listarReportes.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })

    render(<DocumentosProveedor atencion={{ ...atencion, estado: 'En ejecución' }} />)

    expect(await screen.findByText('Aún no hay reporte del proveedor')).toBeTruthy()
  })

  it('si no puede cargar, ofrece reintentar', async () => {
    listarReportes.mockRejectedValueOnce(new ErrorApi(0, null, 'Sin conexión')).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [revision(70, 1, [documento(1, 'InformeFinal', 'informe.pdf')])],
    })
    render(<DocumentosProveedor atencion={atencion} />)
    const usuario = userEvent.setup()

    expect(await screen.findByText('No pudimos cargar los documentos')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: /Reintentar/ }))

    expect(await screen.findByText('informe.pdf')).toBeTruthy()
  })

  it('carga las revisiones anteriores a pedido', async () => {
    listarReportes
      .mockResolvedValueOnce({
        count: 2,
        next: 'http://api/atenciones/9/reportes/?page=2',
        previous: null,
        results: [revision(71, 2, [documento(2, 'InformeFinal', 'informe-v2.pdf')])],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: 'http://api/atenciones/9/reportes/',
        results: [revision(70, 1, [documento(1, 'InformeFinal', 'informe-v1.pdf')])],
      })
    render(<DocumentosProveedor atencion={atencion} />)
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Ver revisiones anteriores' }))

    expect(await screen.findByText('informe-v1.pdf')).toBeTruthy()
    expect(listarReportes).toHaveBeenLastCalledWith(9, 2)
    expect(screen.queryByRole('button', { name: 'Ver revisiones anteriores' })).toBeNull()
  })
})
