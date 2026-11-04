// RF-SER-003 y RF-SER-011 · Paso 3: revisión antes de registrar
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import type { TipoServicio, UnidadMedida } from '@/types/tercerizados'
import { textoOrigen } from '@/utils/estadosTercerizados'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { normalizarMetrado, type BorradorAtencion } from '@/utils/nuevaAtencion'
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
      <Tarjeta
        titulo="Contrato y origen"
        relleno="amplio"
        acciones={
          <Boton variante="fantasma" compacto onClick={() => onEditar(0)} aria-label="Editar contrato y origen">
            Editar
          </Boton>
        }
      >
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Contrato', valor: contrato?.numero },
            { etiqueta: 'Proveedor', valor: contrato?.proveedor_nombre },
            { etiqueta: 'Servicio', valor: contrato?.tipo_servicio_nombre },
            { etiqueta: 'Vigencia', valor: contrato ? `Hasta ${formatearFecha(contrato.vigencia_fin)}` : null },
            { etiqueta: 'Origen', valor: borrador.origen ? textoOrigen(borrador.origen) : null },
            unidad !== null && { etiqueta: 'Unidad solicitante', valor: unidad },
            { etiqueta: 'Riesgo', valor: riesgo ? <Estado tono="aviso" texto="Atención de riesgo" /> : 'No' },
            { etiqueta: 'Descripción', valor: <span className={estilos.textoLargo}>{borrador.descripcion.trim()}</span>, ancho: true },
          ]}
        />
      </Tarjeta>

      <Tarjeta
        titulo={`Espacios y ejemplares (${formatearNumero(borrador.alcances.length)})`}
        relleno="amplio"
        acciones={
          <Boton variante="fantasma" compacto onClick={() => onEditar(1)} aria-label="Editar espacios y ejemplares">
            Editar
          </Boton>
        }
      >
        <ul className={estilos.listaRevision}>
          {borrador.alcances.map((a) => {
            const metrado = a.metrado.trim() ? normalizarMetrado(a.metrado) : null
            return (
              <li key={a.clave}>
                <Estado tono="neutro" texto={a.tipo === 'area' ? 'Área verde' : 'Ejemplar'} /> <strong>{a.etiqueta}</strong>
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
      </Tarjeta>

      <AvisoEnLinea tono="info" titulo="Al registrar">
        La atención quedará en «Requerimiento registrado». La orden de compra la emite Logística; después podrás registrar
        su número en la ficha.
      </AvisoEnLinea>
    </div>
  )
}
