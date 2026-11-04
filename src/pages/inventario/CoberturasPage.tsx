import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Estado from '@/components/ui/Estado'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import { crearCobertura, listarCoberturas, modificarCobertura, type CoberturaVegetal } from '@/services/api/coberturas'
import estilos from './Coberturas.module.css'

export default function CoberturasPage() {
  usePaginaActual('Coberturas vegetales', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.coberturas])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const consulta = useConsulta('coberturas-todas', (signal) => listarCoberturas(true, signal))
  const [nombreNueva, setNombreNueva] = useState('')
  const [nombres, setNombres] = useState<Record<number, string>>({})
  const [enCurso, setEnCurso] = useState<number | 'nueva' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)

  if (!puedeGestionar) {
    return (
      <EstadoError
        titulo="No tienes permiso para administrar coberturas"
        descripcion="La gestión del catálogo está reservada al jefe de sección."
        onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)}
      />
    )
  }
  if (consulta.estado === 'error' && !consulta.datos) {
    return (
      <EstadoError
        titulo="No pudimos cargar las coberturas"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (!consulta.datos) return consulta.cargaVisible ? <EstadoCarga forma="tabla" /> : null

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    setEnCurso('nueva')
    try {
      const cobertura = await crearCobertura(nombreNueva.trim())
      setNombreNueva('')
      setAviso(`Se añadió «${cobertura.nombre}» al catálogo.`)
      consulta.reintentar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos crear la cobertura.')
    } finally {
      setEnCurso(null)
    }
  }

  async function guardarNombre(cobertura: CoberturaVegetal) {
    const nombre = (nombres[cobertura.id] ?? cobertura.nombre).trim()
    if (nombre === cobertura.nombre) return
    setError(null)
    setAviso(null)
    setEnCurso(cobertura.id)
    try {
      await modificarCobertura(cobertura.id, { nombre })
      setAviso(`Se actualizó «${cobertura.nombre}».`)
      consulta.reintentar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos guardar el nombre.')
    } finally {
      setEnCurso(null)
    }
  }

  async function cambiarEstado(cobertura: CoberturaVegetal) {
    setError(null)
    setAviso(null)
    setEnCurso(cobertura.id)
    try {
      await modificarCobertura(cobertura.id, { activo: !cobertura.activo })
      setAviso(`«${cobertura.nombre}» ${cobertura.activo ? 'se desactivó' : 'se activó'}.`)
      consulta.reintentar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos cambiar el estado.')
    } finally {
      setEnCurso(null)
    }
  }

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes} className={estilos.volver}>Volver al inventario</BotonEnlace>
      <Tarjeta
        titulo="Catálogo de coberturas vegetales"
        descripcion="Las coberturas activas aparecen al registrar un área. Si una cobertura deja de usarse, desactívala para conservar las referencias existentes."
        relleno="amplio"
      >
        <form className={estilos.alta} onSubmit={crear}>
          <CampoFormulario
            id="nombre-cobertura"
            etiqueta="Nueva cobertura"
            value={nombreNueva}
            onChange={(evento) => setNombreNueva(evento.target.value)}
            maxLength={120}
            required
          />
          <Boton type="submit" variante="primario" cargando={enCurso === 'nueva'}>
            Añadir cobertura
          </Boton>
        </form>
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
        {consulta.datos.length === 0 ? (
          <EstadoVacio titulo="No hay coberturas" descripcion="Añade una cobertura para que esté disponible en las áreas verdes." nivel={3} />
        ) : (
          <ul className={estilos.lista}>
            {consulta.datos.map((cobertura) => (
              <li className={estilos.fila} key={cobertura.id}>
                <div className={estilos.nombre}>
                  <CampoFormulario
                    id={`cobertura-${cobertura.id}`}
                    etiqueta={`Nombre de ${cobertura.nombre}`}
                    etiquetaOculta
                    value={nombres[cobertura.id] ?? cobertura.nombre}
                    onChange={(evento) =>
                      setNombres((anteriores) => ({ ...anteriores, [cobertura.id]: evento.target.value }))
                    }
                    maxLength={120}
                    disabled={enCurso === cobertura.id}
                  />
                  <Estado tono={cobertura.activo ? 'exito' : 'neutro'} texto={cobertura.activo ? 'Activa' : 'Inactiva'} />
                </div>
                <div className={estilos.accionesFila}>
                  <Boton
                    variante="secundario"
                    onClick={() => void guardarNombre(cobertura)}
                    deshabilitado={enCurso !== null || (nombres[cobertura.id] ?? cobertura.nombre).trim() === cobertura.nombre}
                  >
                    Guardar nombre
                  </Boton>
                  <Boton
                    variante="fantasma"
                    onClick={() => void cambiarEstado(cobertura)}
                    deshabilitado={enCurso !== null}
                  >
                    {cobertura.activo ? 'Desactivar' : 'Activar'}
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}
