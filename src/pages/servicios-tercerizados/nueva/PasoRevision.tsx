// RF-SER-003 y RF-SER-011 · Paso 3: revisión antes de registrar
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import ListaDescripcion from '../../../components/ui/ListaDescripcion'
import type { TipoServicio, UnidadMedida } from '../../../types/tercerizados'
import { textoOrigen } from '../../../utils/estadosTercerizados'
import { formatearFecha, formatearNumero } from '../../../utils/formato'
import { normalizarMetrado, type BorradorAtencion } from '../../../utils/nuevaAtencion'
import estilos from './NuevaAtencion.module.css'

export interface PasoRevisionProps {
  borrador: BorradorAtencion
  servicio: TipoServicio | null
  unidadesMedida: UnidadMedida[]
  onEditar: (paso: 0 | 1) => void
}

export default function PasoRevision({ borrador, servicio, unidadesMedida, onEditar }: PasoRevisionProps) {
  const { contrato } = borrador
  const riesgo = borrador.es_riesgo || Boolean(servicio?.es_riesgo)
  const unidad =
    borrador.origen !== 'SolicitudUnidad'
      ? null
      : borrador.unidadModo === 'existente'
        ? (borrador.unidad?.nombre ?? '')
        : `${borrador.unidadProvisional.trim()} (se registrará como provisional)`
  const simbolo = (id: string) => {
    const u = unidadesMedida.find((x) => String(x.id) === id)
    return u ? u.simbolo || u.nombre : ''
  }

  return (
    <div className={estilos.paso}>
      <section className={estilos.grupo} aria-labelledby="revision-contrato">
        <div className={estilos.cabeceraGrupo}>
          <h2 id="revision-contrato" className={estilos.tituloGrupo}>
            Contrato y origen
          </h2>
          <Boton variante="terciario" compacto onClick={() => onEditar(0)} aria-label="Editar contrato y origen">
            Editar
          </Boton>
        </div>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Contrato', valor: contrato?.numero },
            { etiqueta: 'Proveedor', valor: contrato?.proveedor_nombre },
            { etiqueta: 'Servicio', valor: contrato?.tipo_servicio_nombre },
            { etiqueta: 'Vigencia', valor: contrato ? `Hasta ${formatearFecha(contrato.vigencia_fin)}` : null },
            { etiqueta: 'Origen', valor: borrador.origen ? textoOrigen(borrador.origen) : null },
            unidad !== null && { etiqueta: 'Unidad solicitante', valor: unidad },
            { etiqueta: 'Riesgo', valor: riesgo ? <Badge tono="advertencia" texto="Atención de riesgo" /> : 'No' },
            { etiqueta: 'Descripción', valor: <span className={estilos.textoLargo}>{borrador.descripcion.trim()}</span>, ancho: true },
          ]}
        />
      </section>

      <section className={estilos.grupo} aria-labelledby="revision-alcances">
        <div className={estilos.cabeceraGrupo}>
          <h2 id="revision-alcances" className={estilos.tituloGrupo}>
            Espacios y ejemplares ({formatearNumero(borrador.alcances.length)})
          </h2>
          <Boton variante="terciario" compacto onClick={() => onEditar(1)} aria-label="Editar espacios y ejemplares">
            Editar
          </Boton>
        </div>
        <ul className={estilos.listaRevision}>
          {borrador.alcances.map((a) => {
            const metrado = a.metrado.trim() ? normalizarMetrado(a.metrado) : null
            return (
              <li key={a.clave}>
                <Badge tono="neutral" texto={a.tipo === 'area' ? 'Área verde' : 'Ejemplar'} /> <strong>{a.etiqueta}</strong>
                {a.detalle && <span className={estilos.ayuda}> · {a.detalle}</span>}
                {metrado !== null && (
                  <span className="cifra">
                    {' '}
                    · {formatearNumero(Number(metrado), 2)} {simbolo(a.unidad_medida_id)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <AvisoEnLinea tono="info" titulo="Al registrar">
        La atención quedará en «Requerimiento registrado». La orden de compra la emite Logística; después podrás registrar
        su número en la ficha.
      </AvisoEnLinea>
    </div>
  )
}
