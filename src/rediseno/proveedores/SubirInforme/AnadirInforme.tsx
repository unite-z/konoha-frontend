/**
 * Añadir un informe a la lista (RD-56): una atención de las que esperan informe o su número. Con el número, la
 * atención puede resultar «por revisar» (no existe o ya no espera informe), y se ve así en la lista.
 */
import { useState, type FormEvent } from 'react'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { listarAtenciones } from '@/services/api/tercerizados'
import { SIN_VALOR } from '@/utils/formato'
import { leerAtencionId } from './informes'
import estilos from './SubirInforme.module.css'

export interface AnadirInformeProps {
  /** Atenciones que ya están en la lista. */
  enLista: ReadonlySet<number>
  onAnadir: (atencionId: number) => void
}

export default function AnadirInforme({ enLista, onAnadir }: AnadirInformeProps) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | undefined>()
  const esperan = useConsulta(
    'subir-informe-esperan',
    (signal) => listarAtenciones({ estado: 'Ejecutado pendiente de reporte' }, 1, signal),
    (datos) => datos.results.length === 0,
  )

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const id = leerAtencionId(texto)
    if (id === null) return setError('Escribe el número de la atención, un entero positivo')
    if (enLista.has(id)) return setError('Esa atención ya está en la lista')
    setError(undefined)
    setTexto('')
    onAnadir(id)
  }

  let lista
  if (esperan.error?.estado === 403) lista = <EstadoSinAcceso nivel={3} titulo="No puedes ver las atenciones" />
  else if (esperan.error)
    lista = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar las atenciones"
        descripcion={esperan.error.detalle}
        onReintentar={esperan.reintentar}
      />
    )
  else if (esperan.estado === 'vacio')
    lista = (
      <EstadoVacio
        nivel={3}
        titulo="Ninguna atención espera informe"
        descripcion="Escribe el número de otra atención para añadirla."
      />
    )
  else if (esperan.datos)
    lista = (
      <ul className={estilos.opciones} aria-label="Atenciones que esperan informe">
        {esperan.datos.results.map((a) => (
          <li key={a.id} className={estilos.opcion}>
            <span className={estilos.principal}>
              <span className={estilos.codigo}>{a.codigo}</span>
              <span className={estilos.secundario}>
                {a.proveedor_nombre ?? SIN_VALOR} · {a.tipo_servicio_nombre ?? SIN_VALOR}
              </span>
            </span>
            <Boton
              variante="secundario"
              compacto
              deshabilitado={enLista.has(a.id)}
              onClick={() => onAnadir(a.id)}
              aria-label={`Añadir ${a.codigo}`}
            >
              {enLista.has(a.id) ? 'En la lista' : 'Añadir'}
            </Boton>
          </li>
        ))}
      </ul>
    )
  else lista = esperan.cargaVisible ? <EstadoCarga forma="tabla" filas={2} /> : null

  return (
    <section className={estilos.seccion} aria-labelledby="subir-informe-anadir">
      <h2 id="subir-informe-anadir" className={estilos.tituloSeccion}>
        Añadir un informe
      </h2>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <CampoFormulario
          id="subir-informe-atencion"
          etiqueta="N.º de la atención"
          ayuda="Se asocia el informe a esa atención"
          formato="entero"
          autoComplete="off"
          value={texto}
          error={error}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className={estilos.accionFormulario}>
          <Boton type="submit" variante="secundario">
            Añadir a la lista
          </Boton>
        </div>
      </form>
      <h3 className={estilos.subtituloSeccion}>Atenciones que esperan informe</h3>
      {lista}
    </section>
  )
}
