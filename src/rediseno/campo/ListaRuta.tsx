/**
 * Jardines de la ruta de hoy (V13): avance, pestañas «Por cortar» y «Marcados» y, sin conexión o con marcas por enviar,
 * una sola lista con las «Sin sincronizar» arriba (Figma 353-2396). La fila de un jardín marcado crece hasta ser su hoja
 * (transición `fila(id)`) y la cifra de avance pasa al detalle.
 */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import BarraAvance from '@/design-system/BarraAvance'
import EstadoVacio from '@/design-system/EstadoVacio'
import FilaChecklist from '@/design-system/FilaChecklist'
import Pestanas from '@/design-system/Pestanas'
import Tarjeta from '@/design-system/Tarjeta'
import {
  detalleMarcado,
  detallePendiente,
  marcados,
  porCortar,
  tituloJardin,
  type MarcaPendiente,
} from '@/pages/corte/rutaDeHoy'
import type { JardinRuta, RutaDeHoy } from '@/types/corte'
import { estiloTransicion, fila } from '../base/movimiento'
import { NOMBRE_CIFRA_AVANCE } from './nombres'
import estilos from './Campo.module.css'

export interface ListaRutaProps {
  ruta: RutaDeHoy
  onMarcar: (jardin: JardinRuta) => void
  onAbrirMarcado: (jardin: JardinRuta) => void
  /** Jardín con la hoja abierta: su fila y la cifra ya no llevan el nombre de transición (lo lleva la hoja). */
  abierto: number | null
  enviando: number | null
  /** Marcas hechas sin conexión, por jardín. */
  sinSincronizar: Record<number, MarcaPendiente>
  sinConexion: boolean
  onFueraDeRuta: () => void
}

export default function ListaRuta({
  ruta,
  onMarcar,
  onAbrirMarcado,
  abierto,
  enviando,
  sinSincronizar,
  sinConexion,
  onFueraDeRuta,
}: ListaRutaProps) {
  const [pestana, setPestana] = useState('por-cortar')
  const enEspera = ruta.jardines.filter((j) => sinSincronizar[j.id])
  const pendientes = porCortar(ruta.jardines).filter((j) => !sinSincronizar[j.id])
  const hechos = marcados(ruta.jardines)
  const total = ruta.jardines.length
  const avance = hechos.length + enEspera.length

  function item(jardin: JardinRuta, contenido: React.ReactNode) {
    return (
      <li key={jardin.id} style={abierto === jardin.id ? undefined : estiloTransicion(fila(jardin.id))}>
        {contenido}
      </li>
    )
  }

  return (
    <>
      <Tarjeta relleno="amplio" etiqueta="Avance de la ruta">
        <div className={estilos.avance}>
          <p className={estilos.ciclo}>
            {ruta.servicio} · {ruta.codigo}
          </p>
          <p className={estilos.cifra} style={abierto === null ? estiloTransicion(NOMBRE_CIFRA_AVANCE) : undefined}>
            <span className={estilos.numero}>
              {avance} de {total}
            </span>
            <span>jardines</span>
          </p>
          <BarraAvance
            valor={avance}
            maximo={total}
            etiqueta="Avance de la ruta"
            textoValor={`${avance} de ${total} jardines`}
          />
        </div>
      </Tarjeta>

      {sinConexion ? (
        <ul className={estilos.lista} aria-label="Jardines de la ruta">
          {enEspera.map((jardin) =>
            item(
              jardin,
              <FilaChecklist
                titulo={tituloJardin(jardin)}
                detalle={detallePendiente(sinSincronizar[jardin.id])}
                estado="Sin sincronizar"
                deshabilitada
                onPulsar={() => undefined}
              />,
            ),
          )}
          {pendientes.map((jardin) =>
            item(
              jardin,
              <FilaChecklist
                titulo={tituloJardin(jardin)}
                detalle={jardin.zona}
                estado="Pendiente"
                onPulsar={() => onMarcar(jardin)}
              />,
            ),
          )}
        </ul>
      ) : (
        <Pestanas
          etiqueta="Jardines de la ruta"
          valor={pestana}
          onCambiar={setPestana}
          ancho="completo"
          pestanas={[
            { valor: 'por-cortar', texto: 'Por cortar', contador: pendientes.length },
            { valor: 'marcados', texto: 'Marcados', contador: hechos.length },
          ]}
        >
          {pestana === 'por-cortar' ? (
            <>
              {pendientes.length === 0 ? (
                <EstadoVacio titulo="Ruta completa" descripcion="Todos los jardines de hoy están marcados." nivel={3} />
              ) : (
                <ul className={estilos.lista}>
                  {pendientes.map((jardin) =>
                    item(
                      jardin,
                      <FilaChecklist
                        titulo={tituloJardin(jardin)}
                        detalle={jardin.zona}
                        estado="Pendiente"
                        deshabilitada={enviando === jardin.id}
                        onPulsar={() => onMarcar(jardin)}
                      />,
                    ),
                  )}
                </ul>
              )}
              {/* Supuesto de CU-011 2b (por validar): el acceso a «Jardín fuera de ruta», Figma 375-6772. */}
              <Boton variante="fantasma" icono="plus" onClick={onFueraDeRuta}>
                Añadir jardín fuera de ruta
              </Boton>
            </>
          ) : hechos.length === 0 ? (
            <EstadoVacio titulo="Sin marcas todavía" descripcion="Los jardines que marques aparecerán aquí." nivel={3} />
          ) : (
            <ul className={estilos.lista}>
              {hechos.map((jardin) =>
                item(
                  jardin,
                  <FilaChecklist
                    titulo={tituloJardin(jardin)}
                    detalle={detalleMarcado(jardin)}
                    estado="Marcado"
                    onPulsar={() => onAbrirMarcado(jardin)}
                  />,
                ),
              )}
            </ul>
          )}
        </Pestanas>
      )}
    </>
  )
}
