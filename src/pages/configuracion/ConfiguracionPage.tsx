/**
 * Configuración (AV-389): ajustes de cada usuario. La primera sección es «Apariencia»: el tema (claro, oscuro o el
 * del sistema) y el color de acento, de la paleta PUCP. La elección se aplica al instante y se recuerda en este
 * navegador (`utils/apariencia.ts`).
 */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import GrupoOpciones, { type OpcionGrupo } from '@/design-system/GrupoOpciones'
import Tarjeta from '@/design-system/Tarjeta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { cambiarApariencia, leerApariencia, type Acento, type Apariencia, type Tema } from '@/utils/apariencia'
import estilos from './Configuracion.module.css'

const TITULO = 'Configuración'

const OPCIONES_TEMA: OpcionGrupo<Tema>[] = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Según el sistema' },
]

const OPCIONES_ACENTO: OpcionGrupo<Acento>[] = [
  {
    valor: 'institucional',
    texto: 'Azul institucional',
    descripcion: 'El color principal de la PUCP (predeterminado)',
  },
  { valor: 'azul', texto: 'Azul PUCP', descripcion: 'Secundario oscuro, más vivo' },
  { valor: 'verde', texto: 'Verde PUCP', descripcion: 'Secundario oscuro, el de las áreas verdes' },
  { valor: 'morado', texto: 'Morado PUCP', descripcion: 'Secundario saturado' },
  { valor: 'magenta', texto: 'Magenta PUCP', descripcion: 'Secundario saturado' },
]

export default function ConfiguracionPage() {
  usePaginaActual(TITULO, [{ texto: TITULO }])
  const [apariencia, setApariencia] = useState<Apariencia>(() => leerApariencia())

  function cambiar(parcial: Partial<Apariencia>) {
    const nueva = { ...apariencia, ...parcial }
    setApariencia(nueva)
    cambiarApariencia(nueva)
  }

  return (
    <div className={estilos.pagina}>
      <Tarjeta titulo="Apariencia" descripcion="Cómo se ve la aplicación en este navegador. Solo te afecta a ti.">
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
      </Tarjeta>
    </div>
  )
}
