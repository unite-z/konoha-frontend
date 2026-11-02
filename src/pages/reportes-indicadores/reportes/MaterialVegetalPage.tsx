// RF-REP-005 · HU-MOD05-029 · CU-MOD05-029 (compartido con MOD-06; sin CP)
/**
 * Consumo y propagación de material vegetal e insumos de un mes, por tipo y espacio.
 *
 * - Separa lo consumido, lo propagado y (HU v2) lo trasladado entre espacios, con su origen y destino, en
 *   pestañas. Cada pestaña es un gráfico agrupado (material, espacio, categoría; o ruta, material, origen y
 *   destino) con chips de unidad: las cantidades de unidades distintas nunca se suman. Al elegir una barra,
 *   «Ver detalles» abre sus movimientos; «Ver todos los movimientos», la tabla completa de la pestaña.
 * - Compara el mes con los 3 anteriores (paso 4) en columnas por mes. Un mes sin movimientos se muestra
 *   «Sin movimientos», nunca con ceros.
 * - 1a: el mes sin registros muestra el estado vacío con el motivo del back-end.
 * - 2a: los consumos sin espacio llegan del back-end como «Sin espacio».
 * - 3a: los productos agronómicos aplicados por proveedores van en una sección aparte, sin mezclarse.
 * - La exportación (paso 5) es RF-REP-009: no está en esta pantalla.
 *
 * Esta pantalla no tiene mockup: sigue el patrón de los demás reportes (`PlantillaReporte`).
 */
import { useState } from 'react'
import AyudaEmergente from '../../../components/reportes-indicadores/AyudaEmergente'
import DialogoDetalle from '../../../components/reportes-indicadores/DialogoDetalle'
import GraficoAgrupado from '../../../components/reportes-indicadores/graficos/GraficoAgrupado'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import FiltroMes from '../../../components/ui/FiltroMes'
import Pestanas from '../../../components/ui/Pestanas'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerMaterialVegetal } from '../../../services/api/reportesGestion'
import type { ResultadoMaterialVegetal, TotalMaterial, TotalMes, TotalTraslado } from '../../../types/reportesGestion'
import { formatearMes, formatearNumero } from '../../../utils/formato'
import { enteroPositivo, mesActualLima } from '../../../utils/reportesGestion'
import estilosMaterial from './MaterialVegetal.module.css'
import GraficoComparacion from './material-vegetal/GraficoComparacion'
import {
  AGRUPACIONES_MATERIAL,
  AGRUPACIONES_TRASLADO,
  mesesComparacion,
  MOVIMIENTOS,
  unidadDe,
  type Movimiento,
} from './material-vegetal/materialVegetal'
import { TablaMateriales, TablaMes, TablaTraslados } from './material-vegetal/TablasMaterial'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'

const TITULO = 'Consumo y propagación de material vegetal'

const AYUDA_MES = 'Formato AAAA-MM: año y mes, por ejemplo 2026-10'

/** Pestaña de la URL, o «consumido» si no es válida. */
function leerVista(valor: string): Movimiento {
  return MOVIMIENTOS.find((v) => v.valor === valor)?.valor ?? 'consumido'
}

/** Registros abiertos en el diálogo «Ver detalles». */
type Detalle =
  | { tipo: 'material'; titulo: string; filas: TotalMaterial[] }
  | { tipo: 'traslado'; titulo: string; filas: TotalTraslado[] }
  | { tipo: 'mes'; titulo: string; filas: TotalMes[] }

/** Gráfico de una pestaña, con «Ver todos los movimientos». */
function MovimientosVista({
  vista,
  datos,
  onDetalle,
}: {
  vista: Movimiento
  datos: ResultadoMaterialVegetal
  onDetalle: (detalle: Detalle) => void
}) {
  const texto = MOVIMIENTOS.find((v) => v.valor === vista)?.texto.toLowerCase() ?? vista
  const total = vista === 'trasladado' ? datos.trasladado.length : datos[vista].length
  if (total === 0) return <EstadoVacio nivel={3} titulo={`Sin material ${texto} en el mes`} />

  const verTodos = () =>
    vista === 'trasladado'
      ? onDetalle({ tipo: 'traslado', titulo: `Material ${texto}`, filas: datos.trasladado })
      : onDetalle({ tipo: 'material', titulo: `Material ${texto}`, filas: datos[vista] })

  return (
    <div className={estilos.seccion}>
      {vista === 'trasladado' ? (
        <GraficoAgrupado<TotalTraslado>
          // Al cambiar los datos, el gráfico olvida la barra elegida.
          key={datos.generado_en}
          filas={datos.trasladado}
          agrupaciones={AGRUPACIONES_TRASLADO}
          unidadDe={unidadDe}
          onVerDetalle={(titulo, filas) => onDetalle({ tipo: 'traslado', titulo, filas })}
        />
      ) : (
        <GraficoAgrupado<TotalMaterial>
          key={`${vista}|${datos.generado_en}`}
          filas={datos[vista]}
          agrupaciones={AGRUPACIONES_MATERIAL}
          unidadDe={unidadDe}
          onVerDetalle={(titulo, filas) => onDetalle({ tipo: 'material', titulo, filas })}
        />
      )}
      <div className={estilosMaterial.acciones}>
        <Boton variante="secundario" onClick={verTodos}>
          Ver todos los movimientos ({formatearNumero(total)})
        </Boton>
      </div>
    </div>
  )
}

export default function MaterialVegetalPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  // SUPUESTO (pendiente de confirmar): mes predeterminado = mes actual (en Lima).
  const { filtros, establecer } = useFiltrosUrl({ mes: mesActualLima(), area_verde_id: '', vista: 'consumido' })
  const { mes, area_verde_id: area } = filtros
  const vista = leerVista(filtros.vista)
  const areaNumerica = enteroPositivo(area)
  const catalogos = useCatalogosFiltros()
  const [detalle, setDetalle] = useState<Detalle | null>(null)

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
        <div className={estilosMaterial.filtros}>
          <FiltroMes
            idBase="material-vegetal"
            mes={mes}
            errorServidor={errorMes}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
            ayudaEmergente={<AyudaEmergente id="material-vegetal-ayuda-mes" tema="el mes" texto={AYUDA_MES} />}
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
        </div>
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
        const totales: Record<Movimiento, number> = {
          consumido: datos.consumido.length,
          propagado: datos.propagado.length,
          trasladado: datos.trasladado.length,
        }
        return (
          <>
            <section className={estilos.seccion} aria-labelledby="titulo-movimientos">
              <h2 id="titulo-movimientos" className={estilos.tituloSeccion}>
                Movimientos del mes
              </h2>
              <Pestanas
                etiqueta="Movimientos del mes"
                valor={vista}
                onCambiar={(valor) => establecer({ vista: valor })}
                pestanas={MOVIMIENTOS.map((v) => ({
                  valor: v.valor,
                  texto: v.texto,
                  extra: <span className="cifra"> ({formatearNumero(totales[v.valor])})</span>,
                }))}
              >
                <MovimientosVista vista={vista} datos={datos} onDetalle={setDetalle} />
              </Pestanas>
            </section>

            {datos.comparacion.length > 0 && (
              <section className={estilos.seccion} aria-labelledby="titulo-comparacion">
                <h2 id="titulo-comparacion" className={estilos.tituloSeccion}>
                  Comparación con meses anteriores
                </h2>
                <p className={estilos.ayuda}>
                  {formatearMes(mes)} frente a los 3 meses anteriores. Las cantidades no se suman entre unidades.
                </p>
                <GraficoComparacion
                  key={datos.generado_en}
                  meses={mesesComparacion(datos)}
                  onVerDetalle={(titulo, filas) => setDetalle({ tipo: 'mes', titulo, filas })}
                />
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
                // TODO: definir su tabla cuando el back-end envíe los productos aplicados por proveedores (flujo 3a); hoy
                // siempre llegan «sin datos».
                <p className={estilos.ayuda}>Los productos aplicados por proveedores todavía no se pueden mostrar</p>
              )}
            </section>

            {datos.notas.map((nota) => (
              <AvisoEnLinea key={nota} tono="info">
                {nota}
              </AvisoEnLinea>
            ))}

            <DialogoDetalle
              abierto={detalle !== null}
              titulo={detalle?.titulo ?? ''}
              descripcion={formatearMes(mes)}
              onCerrar={() => setDetalle(null)}
            >
              {detalle?.tipo === 'material' && <TablaMateriales titulo={detalle.titulo} filas={detalle.filas} />}
              {detalle?.tipo === 'traslado' && <TablaTraslados titulo={detalle.titulo} filas={detalle.filas} />}
              {detalle?.tipo === 'mes' && <TablaMes titulo={detalle.titulo} filas={detalle.filas} />}
            </DialogoDetalle>
          </>
        )
      }}
    </PlantillaReporte>
  )
}
