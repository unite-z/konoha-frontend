/**
 * «Registros implicados» de un hallazgo (RF-IA-002). En duplicados (o con varios registros), una comparación lado a
 * lado: en filas los campos y en columnas los registros, con las diferencias resaltadas y marcadas «Distinto» (nunca
 * solo con color). En móvil, un bloque por campo. Con un solo registro, sus datos en una lista.
 * Cada registro enlaza con su módulo cuando hay pantalla (`rutaRegistro`).
 */
// Excepción al sistema (AV-351): tabla de comparación campo a campo entre registros; TablaDatos es para listados.
import { useEsMovil } from '../../../../components/reportes-indicadores/useEsMovil'
import { BotonEnlace } from '../../../../components/ui/Boton'
import ListaDescripcion from '../../../../components/ui/ListaDescripcion'
import type { RegistroImplicado } from '../../../../types/inconsistenciasIa'
import { SIN_VALOR } from '../../../../utils/formato'
import { filasComparacion, rutaRegistro } from '../../../../utils/inconsistenciasIa'
import estilos from './Inconsistencias.module.css'
import Estado from '../../../../components/ui/Estado'

function Encabezado({ registro, conservar }: { registro: RegistroImplicado; conservar: boolean }) {
  const enlace = rutaRegistro(registro)
  return (
    <span className={estilos.encabezadoRegistro}>
      <span className={estilos.nombreRegistro}>{registro.codigo ?? registro.etiqueta}</span>
      {conservar && <Estado tono="exito" texto="Se propone conservar" />}
      {enlace && (
        <BotonEnlace to={enlace.ruta} variante="fantasma">
          {enlace.texto}
        </BotonEnlace>
      )}
    </span>
  )
}

export interface RegistrosImplicadosProps {
  registros: RegistroImplicado[]
  /** Registro que la propuesta conserva (duplicados). */
  conservarId: number | null
}

export default function RegistrosImplicados({ registros, conservarId }: RegistrosImplicadosProps) {
  const esMovil = useEsMovil()
  const conservar = (r: RegistroImplicado) => r.registro_id === conservarId

  if (registros.length === 1) {
    const [unico] = registros
    return (
      <div className={estilos.registro}>
        <Encabezado registro={unico} conservar={false} />
        <ListaDescripcion elementos={Object.entries(unico.campos).map(([etiqueta, valor]) => ({ etiqueta, valor: valor ?? SIN_VALOR }))} />
      </div>
    )
  }

  const filas = filasComparacion(registros)

  if (esMovil) {
    return (
      <div className={estilos.bloquesComparacion}>
        <div className={estilos.registrosMovil}>
          {registros.map((r) => (
            <Encabezado key={`${r.entidad}-${r.registro_id}`} registro={r} conservar={conservar(r)} />
          ))}
        </div>
        <ul className={estilos.listaCampos}>
          {filas.map((f) => (
            <li key={f.campo} className={`${estilos.bloqueCampo} ${f.distinto ? estilos.distinto : ''}`}>
              <span className={estilos.nombreCampo}>
                {f.campo}
                {f.distinto && <Estado tono="aviso" texto="Distinto" />}
              </span>
              <dl className={estilos.valoresCampo}>
                {registros.map((r, i) => (
                  <div key={`${r.entidad}-${r.registro_id}`}>
                    <dt>{r.codigo ?? r.etiqueta}</dt>
                    <dd>{f.valores[i] ?? SIN_VALOR}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className={estilos.contenedorTabla}>
      <table className={estilos.comparacion}>
        <caption className="sr-only">Comparación de los registros implicados</caption>
        <thead>
          <tr>
            <th scope="col">Campo</th>
            {registros.map((r) => (
              <th key={`${r.entidad}-${r.registro_id}`} scope="col">
                <Encabezado registro={r} conservar={conservar(r)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.campo} className={f.distinto ? estilos.distinto : undefined}>
              <th scope="row">
                <span className={estilos.nombreCampo}>
                  {f.campo}
                  {f.distinto && <Estado tono="aviso" texto="Distinto" />}
                </span>
              </th>
              {f.valores.map((valor, i) => (
                <td key={i}>{valor ?? SIN_VALOR}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
