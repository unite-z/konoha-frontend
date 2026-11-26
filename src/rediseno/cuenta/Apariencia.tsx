/**
 * Configuración › Apariencia (RD-64, M1-05): tema (con Amarillento), color de acento, vista previa e interruptor
 * «Diseño nuevo». La elección se aplica al instante (con fundido de color; con «reducir movimiento», directa), se
 * recuerda en este navegador y se guarda en la cuenta (`PUT auth/apariencia/`, AV-414). El `PUT` reemplaza la
 * apariencia entera: se le añaden los campos de «Diseño nuevo» para no borrarlos.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import GrupoOpciones, { type OpcionGrupo } from '@/design-system/GrupoOpciones'
import { guardarAparienciaCuenta } from '@/services/api/core'
import {
  cambiarApariencia,
  leerApariencia,
  type Acento,
  type Apariencia as PreferenciaApariencia,
  type Tema,
} from '@/utils/apariencia'
import InterruptorDisenoNuevo from '../base/InterruptorDisenoNuevo'
import { transicionar } from '../base/movimiento'
import { useDisenoNuevo } from '../useDisenoNuevo'
import estilos from './Configuracion.module.css'

const OPCIONES_TEMA: OpcionGrupo<Tema>[] = [
  { valor: 'amarillento', texto: 'Amarillento' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'calido', texto: 'Cálido' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Según el sistema' },
]

const OPCIONES_ACENTO: OpcionGrupo<Acento>[] = [
  {
    valor: 'institucional',
    texto: 'Azul institucional',
    descripcion: 'El color principal de la PUCP (predeterminado)',
  },
  {
    valor: 'azul',
    texto: 'Azul PUCP',
    descripcion: 'Secundario oscuro, más vivo',
  },
  {
    valor: 'verde',
    texto: 'Verde PUCP',
    descripcion: 'Secundario oscuro, el de las áreas verdes',
  },
  { valor: 'morado', texto: 'Morado PUCP', descripcion: 'Secundario saturado' },
  {
    valor: 'magenta',
    texto: 'Magenta PUCP',
    descripcion: 'Secundario saturado',
  },
]

/**
 * Lo que se ve ahora: dentro del diseño nuevo el marco pone el tema amarillento aunque lo guardado sea otro, así que
 * el control marca el que hay en `<html>` y no un tema que no se está viendo.
 */
function aparienciaInicial(): PreferenciaApariencia {
  const guardada = leerApariencia()
  return document.documentElement.dataset.tema === 'amarillento' ? { ...guardada, tema: 'amarillento' } : guardada
}

export default function Apariencia() {
  const [apariencia, setApariencia] = useState<PreferenciaApariencia>(aparienciaInicial)
  const [sinGuardar, setSinGuardar] = useState(false)
  const { camposCuenta } = useDisenoNuevo()

  function cambiar(parcial: Partial<PreferenciaApariencia>) {
    const nueva = { ...apariencia, ...parcial }
    setApariencia(nueva)
    transicionar(() => cambiarApariencia(nueva))
    guardarAparienciaCuenta({ ...nueva, ...camposCuenta }).then(
      () => setSinGuardar(false),
      () => setSinGuardar(true),
    )
  }

  return (
    <div className={estilos.campos}>
      <GrupoOpciones
        etiqueta="Tema"
        opciones={OPCIONES_TEMA}
        valor={apariencia.tema}
        onCambiar={(tema) => cambiar({ tema })}
        segmentado
      />
      <GrupoOpciones
        etiqueta="Color de acento"
        opciones={OPCIONES_ACENTO}
        valor={apariencia.acento}
        onCambiar={(acento) => cambiar({ acento })}
      />
      <InterruptorDisenoNuevo />
      {sinGuardar && (
        <AvisoEnLinea tono="advertencia">
          No pudimos guardarla en tu cuenta: se aplicó solo en este navegador. Se guardará la próxima vez que la cambies
          con conexión.
        </AvisoEnLinea>
      )}
      <section className={estilos.vistaPrevia} aria-label="Vista previa">
        <p className={estilos.rotulo}>Vista previa</p>
        <div className={estilos.muestras}>
          <Boton>Botón principal</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="fantasma">Enlace</Boton>
          <Estado tono="info" texto="En curso" />
          <Estado tono="exito" texto="Atendida" />
        </div>
      </section>
    </div>
  )
}
