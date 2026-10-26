import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import { puedeGestionarCoberturas } from '../../config/permisosInventario'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '../../router/rutasApp'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import { crearCobertura, listarCoberturas, modificarCobertura } from '../../services/api/inventario'
import type { CoberturaVegetal } from '../../types/mod02'
import estilos from './Inventario.module.css'

export default function CoberturasPage() {
  usePaginaActual('Coberturas vegetales', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.coberturas])
  const navegar = useNavigate()
  const { estado: sesion } = useSesionTercerizados()
  const consulta = useConsulta('coberturas-todas', (signal) => listarCoberturas(true, signal))
  const [nombreNueva, setNombreNueva] = useState('')
  const [nombres, setNombres] = useState<Record<number, string>>({})
  const [enCurso, setEnCurso] = useState<number | 'nueva' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const puedeGestionar = sesion.tipo === 'activa' && puedeGestionarCoberturas(sesion.usuario.rol)

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
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Volver al inventario</BotonEnlace>
      <section className={estilos.superficie} aria-labelledby="titulo-coberturas">
        <h2 id="titulo-coberturas">Catálogo de coberturas vegetales</h2>
        <p>Las coberturas activas aparecen al registrar un área. Si una cobertura deja de usarse, desactívala para conservar las referencias existentes.</p>
        <form className={estilos.acciones} onSubmit={crear}>
          <label className={estilos.busqueda} htmlFor="nombre-cobertura">
            <span>Nueva cobertura</span>
            <input
              id="nombre-cobertura"
              value={nombreNueva}
              onChange={(evento) => setNombreNueva(evento.target.value)}
              maxLength={120}
              required
            />
          </label>
          <Boton type="submit" variante="primario" cargando={enCurso === 'nueva'}>
            Añadir cobertura
          </Boton>
        </form>
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
        {consulta.datos.length === 0 ? (
          <EstadoVacio titulo="No hay coberturas" descripcion="Añade una cobertura para que esté disponible en las áreas verdes." nivel={3} />
        ) : (
          <ul className={estilos.listaCoberturas}>
            {consulta.datos.map((cobertura) => (
              <li className={estilos.filaCobertura} key={cobertura.id}>
                <label className={estilos.busqueda} htmlFor={`cobertura-${cobertura.id}`}>
                  <span>{cobertura.activo ? 'Activa' : 'Inactiva'}</span>
                  <input
                    id={`cobertura-${cobertura.id}`}
                    value={nombres[cobertura.id] ?? cobertura.nombre}
                    onChange={(evento) =>
                      setNombres((anteriores) => ({ ...anteriores, [cobertura.id]: evento.target.value }))
                    }
                    maxLength={120}
                    disabled={enCurso === cobertura.id}
                  />
                </label>
                <div className={estilos.accionesBotones}>
                  <Boton
                    variante="secundario"
                    onClick={() => void guardarNombre(cobertura)}
                    deshabilitado={enCurso !== null || (nombres[cobertura.id] ?? cobertura.nombre).trim() === cobertura.nombre}
                  >
                    Guardar nombre
                  </Boton>
                  <Boton
                    variante="terciario"
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
      </section>
    </div>
  )
}
