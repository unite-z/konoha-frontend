/**
 * Hueco de cada dato en `RevisionIa` (RD-56): al elegir «Corregir» pide el valor con el control de su tipo
 * (texto, número, fecha, sí/no o lista JSON). Al montarse avisa de que el dato ya tiene decisión, para el filtro
 * «Pendientes».
 */
import { useEffect } from 'react'
import { AreaTexto } from '@/design-system/CampoFormulario'
import CampoFormulario from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import { convertirCorreccion, idCorreccion } from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'
import type { ContextoHueco } from '@/rediseno/base/RevisionIa/contrato'
import type { CampoSolicitado } from '@/types/ia'
import type { ValorExtraccion } from './adaptadorExtraccion'
import estilos from './SubirInforme.module.css'

export interface HuecoExtraccionProps {
  contexto: ContextoHueco<ValorExtraccion>
  campo: CampoSolicitado
  onDecidido: (clave: string) => void
}

export default function HuecoExtraccion({ contexto, campo, onDecidido }: HuecoExtraccionProps) {
  const { elemento, decision, cambiar } = contexto
  useEffect(() => onDecidido(elemento.id), [onDecidido, elemento.id])
  if (decision.accion !== 'corregir') return null

  const texto = decision.valorFinal?.texto ?? ''
  const { error } = convertirCorreccion(campo.tipo_dato, texto)
  const comun = {
    id: idCorreccion(elemento.id),
    etiqueta: `Valor corregido de ${campo.nombre_campo ?? elemento.titulo}`,
    // El valor vacío no se marca hasta enviar: se comprueba al validar.
    error: error && texto.trim() !== '' ? error : undefined,
  }
  const alCambiar = (nuevo: string) => cambiar({ valorFinal: { valor: null, texto: nuevo } })

  let control
  switch (campo.tipo_dato) {
    case 'Texto largo':
    case 'JSON':
      control = (
        <AreaTexto
          {...comun}
          rows={campo.tipo_dato === 'JSON' ? 4 : 3}
          value={texto}
          onChange={(e) => alCambiar(e.target.value)}
        />
      )
      break
    case 'Booleano':
      control = (
        <Selector
          {...comun}
          valor={texto}
          opcionTodos="Elige una opción"
          opciones={[
            { valor: 'si', texto: 'Sí' },
            { valor: 'no', texto: 'No' },
          ]}
          onCambiar={alCambiar}
        />
      )
      break
    default:
      control = (
        <CampoFormulario
          {...comun}
          type={campo.tipo_dato === 'Fecha' ? 'date' : 'text'}
          formato={campo.tipo_dato === 'Entero' ? 'entero' : campo.tipo_dato === 'Decimal' ? 'decimal' : undefined}
          negativo
          value={texto}
          onChange={(e) => alCambiar(e.target.value)}
        />
      )
  }
  return <div className={estilos.correccion}>{control}</div>
}
