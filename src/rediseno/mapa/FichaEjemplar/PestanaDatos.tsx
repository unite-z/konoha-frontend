import { useState, type FormEvent } from 'react'
import Adjuntos from '@/components/core/Adjuntos'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import ListaDescripcion from '@/design-system/ListaDescripcion'
import FotoEjemplar from '@/pages/inventario/FotoEjemplar'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarAliasEjemplar, guardarAlturaEjemplar } from '@/services/api/ejemplares'
import type { EjemplarInventario } from '@/types/ejemplares'
import { nombreSituacionSingular } from '../PanelArea/formato'
import estilos from './FichaEjemplar.module.css'

interface Props {
  ejemplar: EjemplarInventario
  puedeEditar: boolean
  onActualizado: (ejemplar: EjemplarInventario) => void
  /** «Editar ubicación»: la ficha se aparta y la herramienta de punto toma el mapa. */
  onEditarUbicacion: () => void
}

/** Datos del ejemplar: foto, identificación y situación; con permiso de inventario, alias, altura, foto y ubicación se editan con `PATCH`. */
export default function PestanaDatos({ ejemplar, puedeEditar, onActualizado, onEditarUbicacion }: Props) {
  const [alias, setAlias] = useState(ejemplar.alias ?? '')
  const [altura, setAltura] = useState(ejemplar.altura_total_m === null ? '' : String(ejemplar.altura_total_m))
  const [revisionFoto, setRevisionFoto] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const aliasCambiado = alias.trim() !== (ejemplar.alias ?? '')
  const alturaCambiada = altura !== '' && Number(altura) !== ejemplar.altura_total_m
  const alturaInvalida = altura !== '' && !(Number(altura) > 0 && Number(altura) < 10000)

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando || (!aliasCambiado && !alturaCambiada) || alturaInvalida) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      let actualizado = ejemplar
      if (aliasCambiado) actualizado = await cambiarAliasEjemplar(ejemplar.id, alias.trim())
      if (alturaCambiada) actualizado = await guardarAlturaEjemplar(ejemplar.id, Number(altura))
      onActualizado(actualizado)
      setAviso('Cambios guardados.')
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  const coordenadas =
    ejemplar.latitud !== null && ejemplar.longitud !== null ? `${ejemplar.latitud}, ${ejemplar.longitud}` : null

  return (
    <div className={estilos.seccion}>
      <FotoEjemplar ejemplar={ejemplar} revision={revisionFoto} />
      <ListaDescripcion
        columnas="una"
        elementos={[
          { etiqueta: 'Código', valor: ejemplar.codigo },
          { etiqueta: 'Placa antigua', valor: ejemplar.codigo_placa_antigua },
          {
            etiqueta: 'Especie',
            valor: [ejemplar.especie_nombre_comun, ejemplar.especie_nombre_cientifico].filter(Boolean).join(' · '),
          },
          { etiqueta: 'Alias', valor: ejemplar.alias },
          {
            etiqueta: 'Altura',
            valor: ejemplar.altura_total_m === null ? null : `${ejemplar.altura_total_m} m`,
          },
          {
            etiqueta: 'Situación',
            valor: (
              <Estado
                tono={ejemplar.situacion === 'activo' ? 'exito' : 'neutro'}
                texto={nombreSituacionSingular(ejemplar.situacion)}
              />
            ),
          },
          {
            etiqueta: 'Área verde',
            valor: ejemplar.area_verde_nombre ?? ejemplar.nombre_poligono,
          },
          { etiqueta: 'Ubicación', valor: ejemplar.ubicacion, ancho: true },
          { etiqueta: 'Coordenadas', valor: coordenadas ?? 'Sin coordenadas' },
        ]}
      />
      {ejemplar.advertencia_placa_repetida && (
        <AvisoEnLinea tono="advertencia" compacto>
          Esta placa antigua también figura en otro ejemplar.
        </AvisoEnLinea>
      )}
      {puedeEditar && (
        <>
          <form className={estilos.formulario} onSubmit={(e) => void guardar(e)} aria-label="Editar datos del ejemplar">
            <CampoFormulario
              id="ficha-alias"
              etiqueta="Alias del ejemplar"
              value={alias}
              maxLength={40}
              onChange={(e) => setAlias(e.target.value)}
            />
            <CampoFormulario
              id="ficha-altura"
              etiqueta="Altura total (m)"
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
            />
            <div className={estilos.acciones}>
              <Boton
                type="submit"
                variante="primario"
                compacto
                cargando={guardando}
                deshabilitado={(!aliasCambiado && !alturaCambiada) || alturaInvalida}
              >
                Guardar cambios
              </Boton>
              <Boton variante="secundario" compacto icono="map-pin" onClick={onEditarUbicacion}>
                Editar ubicación
              </Boton>
            </div>
          </form>
          {error && (
            <AvisoEnLinea tono="error" compacto>
              {error}
            </AvisoEnLinea>
          )}
          {aviso && (
            <AvisoEnLinea tono="exito" compacto>
              {aviso}
            </AvisoEnLinea>
          )}
          <section className={estilos.seccion} aria-label="Fotografía del ejemplar">
            <Adjuntos
              entidad="ejemplar"
              registroId={ejemplar.id}
              presentacion="foto"
              puedeAdjuntar
              tiposAceptados=".jpg,.jpeg,.png"
              ayudaCarga="Fotografías JPEG o PNG, de hasta 20 MB."
              prepararArchivo={(archivo) =>
                archivo.type === 'image/jpeg' || archivo.type === 'image/png'
                  ? Promise.resolve(archivo)
                  : Promise.reject(new Error('Selecciona una fotografía JPEG o PNG.'))
              }
              onCambio={() => setRevisionFoto((n) => n + 1)}
            />
          </section>
        </>
      )}
    </div>
  )
}
