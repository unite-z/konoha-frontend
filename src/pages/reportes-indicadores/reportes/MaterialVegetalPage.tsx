// RF-REP-005 · HU-MOD05-029 · CU-MOD05-029 (compartido con MOD-06; sin CP)
/**
 * Consumo y propagación de material vegetal e insumos de un mes, por tipo y espacio.
 *
 * - Separa lo consumido, lo propagado y (HU v2) lo trasladado entre espacios, con su origen y destino, en
 *   pestañas. El back-end agrupa también por unidad: las cantidades de unidades distintas nunca se suman.
 * - Compara el mes con los 3 anteriores (paso 4). Un mes sin movimientos se avisa, nunca se muestra con ceros.
 * - 1a: el mes sin registros muestra el estado vacío con el motivo del back-end.
 * - 2a: los consumos sin espacio llegan del back-end como «Sin espacio».
 * - 3a: los productos agronómicos aplicados por proveedores van en una sección aparte, sin mezclarse.
 * - La exportación (paso 5) es RF-REP-009: no está en esta pantalla.
 *
 * Esta pantalla no tiene mockup: sigue el patrón de los demás reportes (`PlantillaReporte`).
 */
import { useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import FiltroMes from '../../../components/ui/FiltroMes'
import Pestanas from '../../../components/ui/Pestanas'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerMaterialVegetal } from '../../../services/api/reportesGestion'
import type { ResultadoMaterialVegetal, TotalMaterial, TotalTraslado } from '../../../types/reportesGestion'
import { formatearMes, formatearNumero } from '../../../utils/formato'
import {
  enteroPositivo,
  filasComparacion,
  mesActualLima,
  mesesSinDatos,
  numeroDeDecimal,
  type FilaComparacion,
} from '../../../utils/reportesGestion'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'

const TITULO = 'Consumo y propagación de material vegetal'

type Vista = 'consumido' | 'propagado' | 'trasladado'

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: 'consumido', texto: 'Consumido' },
  { valor: 'propagado', texto: 'Propagado' },
  { valor: 'trasladado', texto: 'Trasladado' },
]

/** Pestaña de la URL, o «consumido» si no es válida. */
function leerVista(valor: string): Vista {
  return VISTAS.find((v) => v.valor === valor)?.valor ?? 'consumido'
}

function columnaCantidad<F extends { cantidad: string }>(): ColumnaTabla<F> {
  return {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (f) => numeroDeDecimal(f.cantidad),
    render: (f) => formatearNumero(numeroDeDecimal(f.cantidad)),
  }
}

function columnaMovimientos<F extends { movimientos: number }>(): ColumnaTabla<F> {
  return {
    clave: 'movimientos',
    titulo: 'Movimientos',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.movimientos),
  }
}

const COLUMNAS_MATERIAL: ColumnaTabla<TotalMaterial>[] = [
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  { clave: 'categoria', titulo: 'Categoría' },
  columnaCantidad<TotalMaterial>(),
  { clave: 'unidad', titulo: 'Unidad' },
  columnaMovimientos<TotalMaterial>(),
]

const COLUMNAS_TRASLADO: ColumnaTabla<TotalTraslado>[] = [
  { clave: 'origen', titulo: 'Origen' },
  { clave: 'destino', titulo: 'Destino' },
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  { clave: 'categoria', titulo: 'Categoría' },
  columnaCantidad<TotalTraslado>(),
  { clave: 'unidad', titulo: 'Unidad' },
  columnaMovimientos<TotalTraslado>(),
]

const COLUMNAS_COMPARACION: ColumnaTabla<FilaComparacion>[] = [
  { clave: 'mes', titulo: 'Mes', render: (f) => formatearMes(f.mes) },
  { clave: 'movimiento', titulo: 'Movimiento' },
  { clave: 'tipo_material', titulo: 'Material' },
  { clave: 'unidad', titulo: 'Unidad' },
  { clave: 'cantidad', titulo: 'Cantidad', alineacion: 'derecha', render: (f) => formatearNumero(numeroDeDecimal(f.cantidad)) },
]

function claveMaterial(f: TotalMaterial): string {
  return `${f.area_verde_id ?? 'sin'}|${f.tipo_material}|${f.unidad}`
}

function claveTraslado(f: TotalTraslado): string {
  return `${f.origen_area_id ?? 'sin'}|${f.destino_area_id ?? 'sin'}|${f.tipo_material}|${f.unidad}`
}

function TablaVista({ vista, datos }: { vista: Vista; datos: ResultadoMaterialVegetal }) {
  const texto = VISTAS.find((v) => v.valor === vista)?.texto.toLowerCase() ?? vista
  const vacio = <EstadoVacio nivel={3} titulo={`Sin material ${texto} en el mes`} />
  if (vista === 'trasladado') {
    if (datos.trasladado.length === 0) return vacio
    return (
      <TablaDatos titulo="Material trasladado" columnas={COLUMNAS_TRASLADO} filas={datos.trasladado} claveFila={claveTraslado} />
    )
  }
  const filas = vista === 'consumido' ? datos.consumido : datos.propagado
  if (filas.length === 0) return vacio
  // Orden del back-end: «Sin espacio» al final.
  return <TablaDatos titulo={`Material ${texto}`} columnas={COLUMNAS_MATERIAL} filas={filas} claveFila={claveMaterial} />
}

export default function MaterialVegetalPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  // SUPUESTO (pendiente de confirmar): mes predeterminado = mes actual (en Lima).
  const { filtros, establecer } = useFiltrosUrl({ mes: mesActualLima(), area_verde_id: '', vista: 'consumido' })
  const { mes, area_verde_id: area } = filtros
  const vista = leerVista(filtros.vista)
  const areaNumerica = enteroPositivo(area)
  const catalogos = useCatalogosFiltros()

  // Borrador del espacio: se aplica con el botón de la barra.
  const [borradorArea, setBorradorArea] = useState(area)
  const [origenArea, setOrigenArea] = useState(area)
  if (origenArea !== area) {
    setOrigenArea(area)
    setBorradorArea(area)
  }

  const consulta = useConsulta<ResultadoMaterialVegetal>(
    `material|${mes}|${area}`,
    (signal) => obtenerMaterialVegetal(mes, areaNumerica, signal),
    (datos) => datos.sin_datos,
  )
  const errorMes = consulta.error?.errores_campo.mes?.[0]
  const consultaConCatalogos = {
    ...consulta,
    // Un 400 del mes se muestra solo junto al campo (como el periodo en los demás reportes), sin aviso aparte.
    ...(errorMes ? { estado: 'inactivo' as const, datos: null, error: null } : {}),
    reintentar: () => {
      consulta.reintentar()
      catalogos.reintentar()
    },
  }

  const nombreEspacio = catalogos.espacios.find((o) => o.valor === area)?.texto ?? `n.º ${area}`
  const filtrosActivos = area ? [{ clave: 'area_verde_id', texto: `Espacio: ${nombreEspacio}` }] : []
  const limpiar = () => establecer({ area_verde_id: null })

  return (
    <PlantillaReporte
      consulta={consultaConCatalogos}
      filtros={
        <>
          <FiltroMes
            idBase="material-vegetal"
            mes={mes}
            errorServidor={errorMes}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
            onAplicar={(nuevoMes) => {
              if (nuevoMes === mes && borradorArea === area) consultaConCatalogos.reintentar()
              else establecer({ mes: nuevoMes, area_verde_id: borradorArea })
            }}
          >
            <Selector
              id="material-vegetal-espacio"
              etiqueta="Espacio"
              valor={borradorArea}
              opciones={catalogos.espacios}
              opcionTodos={OPCION_TODOS}
              ayuda={catalogos.ayudaEspacios}
              bloqueadoMotivo={catalogos.motivoBloqueoEspacios}
              onCambiar={setBorradorArea}
            />
          </FiltroMes>
          <ChipsFiltrosActivos filtros={filtrosActivos} onQuitar={limpiar} onLimpiar={limpiar} />
        </>
      }
      vacio={{
        titulo: 'Sin movimientos de material en el mes',
        accion: area ? (
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        ) : undefined,
      }}
    >
      {(datos) => {
        const comparacion = filasComparacion(datos.comparacion)
        const sinDatos = mesesSinDatos(datos.comparacion)
        const totales: Record<Vista, number> = {
          consumido: datos.consumido.length,
          propagado: datos.propagado.length,
          trasladado: datos.trasladado.length,
        }
        return (
          <>
            <Pestanas
              etiqueta="Movimientos del mes"
              valor={vista}
              onCambiar={(valor) => establecer({ vista: valor })}
              pestanas={VISTAS.map((v) => ({
                valor: v.valor,
                texto: v.texto,
                extra: <span className="cifra"> ({formatearNumero(totales[v.valor])})</span>,
              }))}
            >
              <TablaVista vista={vista} datos={datos} />
            </Pestanas>

            {datos.comparacion.length > 0 && (
              <section className={estilos.seccion} aria-labelledby="titulo-comparacion">
                <h2 id="titulo-comparacion" className={estilos.tituloSeccion}>
                  Comparación con meses anteriores
                </h2>
                {sinDatos.length > 0 && (
                  <AvisoEnLinea tono="info">Sin movimientos en: {sinDatos.map(formatearMes).join(', ')}</AvisoEnLinea>
                )}
                {comparacion.length > 0 && (
                  <TablaDatos
                    titulo="Comparación con meses anteriores (las cantidades no se suman entre unidades)"
                    columnas={COLUMNAS_COMPARACION}
                    filas={comparacion}
                    claveFila={(f) => `${f.mes}|${f.movimiento}|${f.tipo_material}|${f.unidad}`}
                  />
                )}
              </section>
            )}

            <section className={estilos.seccion} aria-labelledby="titulo-productos">
              <h2 id="titulo-productos" className={estilos.tituloSeccion}>
                Productos agronómicos aplicados por proveedores
              </h2>
              {datos.productos_proveedor.sin_datos ? (
                <EstadoVacio
                  nivel={3}
                  titulo="Sin productos aplicados registrados"
                  descripcion={datos.productos_proveedor.mensaje_sin_datos ?? undefined}
                />
              ) : (
                // TODO: el back-end aún no envía estos productos (flujo 3a); su tabla se define cuando existan.
                <p className={estilos.ayuda}>Los productos aplicados por proveedores todavía no se pueden mostrar</p>
              )}
            </section>

            {datos.notas.map((nota) => (
              <AvisoEnLinea key={nota} tono="info">
                {nota}
              </AvisoEnLinea>
            ))}
          </>
        )
      }}
    </PlantillaReporte>
  )
}
