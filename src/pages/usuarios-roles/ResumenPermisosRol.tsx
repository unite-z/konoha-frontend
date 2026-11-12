/**
 * Qué puede hacer un rol, por módulo (AV-381): se muestra al dar de alta una cuenta o al cambiarle el rol, para que se
 * vea qué implica elegirlo y no solo cuántos permisos tiene. Solo lectura: se editan en «Roles y permisos».
 */
import type { PermisoCatalogo } from '@/types/core'
import { agruparPorModulo } from '@/utils/permisosRol'
import estilos from './UsuariosRoles.module.css'

export interface ResumenPermisosRolProps {
  nombreRol: string
  permisos: string[]
  /** Catálogo con las descripciones; sin él se muestran los códigos. */
  catalogo: PermisoCatalogo[] | null
}

export default function ResumenPermisosRol({ nombreRol, permisos, catalogo }: ResumenPermisosRolProps) {
  if (permisos.length === 0) {
    return <p className={estilos.descripcionRol}>{nombreRol} no tiene permisos: la cuenta no podrá usar ninguna sección.</p>
  }
  const conocidos = catalogo ?? permisos.map((codigo) => ({ codigo, modulo: codigo.split('.')[0], descripcion: codigo, es_sensible: false }))
  const grupos = agruparPorModulo(conocidos.filter((p) => permisos.includes(p.codigo)))
  return (
    <details className={estilos.resumenPermisos}>
      <summary>
        {nombreRol}: {permisos.length} {permisos.length === 1 ? 'permiso' : 'permisos'}. Ver cuáles
      </summary>
      {grupos.map(({ modulo, permisos: lista }) => (
        <div key={modulo}>
          <p className={estilos.tituloModulo}>{modulo}</p>
          <ul className={estilos.listaPermisos}>
            {lista.map((p) => (
              <li key={p.codigo}>
                {p.descripcion}
                {p.es_sensible ? ' (sensible)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  )
}
