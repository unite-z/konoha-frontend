// RF-SER-001 y RF-SER-002 · Contratos asociados a un proveedor (ficha del proveedor)
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Estado from '@/components/ui/Estado'
import { BotonEnlace } from '@/components/ui/Boton'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { useConsulta } from '@/hooks/useConsulta'
import { rutaDetalleContrato, rutaDetalleProveedor, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { listarContratosMaestro } from '@/services/api/maestrosTercerizados'
import type { ContratoMaestro, ProveedorMaestro } from '@/types/maestrosTercerizados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '@/utils/formato'
import { textoMonto } from '@/utils/validacionMaestros'
import { POR_PAGINA, type EstadoContratoDeProveedor, type EstadoNavegacionContrato } from './filtrosMaestros'
import estilos from './Maestros.module.css'

// El proveedor ya está en el título de la ficha: su columna sobra aquí.
const COLUMNAS: ColumnaTabla<ContratoMaestro>[] = [
  { clave: 'numero', titulo: 'Contrato', render: (c) => <span className={estilos.cifra}>{c.numero}</span> },
  { clave: 'servicio', titulo: 'Servicio', multilinea: true, render: (c) => c.tipo_servicio_nombre ?? SIN_VALOR },
  { clave: 'area', titulo: 'Área o metrado estimado', multilinea: true, render: (c) => c.area_metrado_estimado ?? SIN_VALOR },
  { clave: 'monto', titulo: 'Monto fijo', alineacion: 'derecha', render: (c) => <span className={estilos.cifra}>{textoMonto(c.monto_fijo)}</span> },
  { clave: 'frecuencia', titulo: 'Frecuencia', multilinea: true, render: (c) => c.frecuencia_pactada ?? SIN_VALOR },
  {
    clave: 'vigencia',
    titulo: 'Vigencia',
    render: (c) => (
      <span className={estilos.cifra}>
        {formatearFecha(c.vigencia_inicio)} – {formatearFecha(c.vigencia_fin)}
      </span>
    ),
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (c) =>
      c.vigente ? (
        <Estado tono="exito" texto="Vigente" />
      ) : (
        <Estado tono="aviso" texto="Vencido" ayuda="Se conserva como histórico: no se puede usar en nuevas atenciones" />
      ),
  },
]

export interface ContratosDelProveedorProps {
  proveedor: ProveedorMaestro
  /** Filtros de la lista a los que vuelve la ficha; viajan al formulario y regresan con el aviso. */
  volverA: string
  /** `true` si el usuario puede registrar contratos (muestra «Registrar contrato»). */
  puedeRegistrar: boolean
}

export default function ContratosDelProveedor({ proveedor, volverA, puedeRegistrar }: ContratosDelProveedorProps) {
  const navegar = useNavigate()
  const [pagina, setPagina] = useState(1)
  const consulta = useConsulta(
    `contratos-proveedor|${proveedor.id}|${pagina}`,
    (signal) => listarContratosMaestro({ proveedor_id: proveedor.id }, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const total = consulta.datos?.count ?? 0
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  return (
    <section className={estilos.seccion} aria-labelledby="titulo-contratos-proveedor">
      <div className={estilos.cabeceraSeccion}>
        <h2 id="titulo-contratos-proveedor" className={estilos.tituloSeccion}>
          Contratos asociados
        </h2>
        <span className={estilos.enLinea}>
          {(consulta.estado === 'exito' || consulta.estado === 'vacio') && (
            <span className={estilos.ayuda}>
              {formatearNumero(total)} {total === 1 ? 'contrato' : 'contratos'}
            </span>
          )}
          {/* Un proveedor inhabilitado no admite contratos nuevos: el servidor los rechaza. */}
          {puedeRegistrar && proveedor.activo && (
            <BotonEnlace
              to={RUTAS_TERCERIZADOS.nuevoContrato}
              state={{ proveedor, volverA } satisfies EstadoContratoDeProveedor}
              variante="primario"
            >
              Registrar contrato
            </BotonEnlace>
          )}
        </span>
      </div>
      <TablaDatos
        titulo="Contratos del proveedor"
        columnas={COLUMNAS}
        filas={consulta.datos?.results ?? []}
        claveFila={(c) => String(c.id)}
        estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
        onFilaClick={(c) =>
          navegar(rutaDetalleContrato(c.id), {
            state: { volverA: rutaDetalleProveedor(proveedor.id) } satisfies EstadoNavegacionContrato,
          })
        }
        paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: setPagina }}
        vacio={{
          titulo: 'Este proveedor aún no tiene contratos',
          descripcion: proveedor.activo
            ? 'Aparecerán aquí cuando el jefe de sección registre el primero.'
            : 'Está inhabilitado: habilítalo para poder registrarle contratos.',
        }}
        error={{
          titulo: 'No pudimos cargar los contratos',
          descripcion: consulta.error?.detalle ?? '',
          onReintentar: consulta.reintentar,
        }}
      />
    </section>
  )
}
