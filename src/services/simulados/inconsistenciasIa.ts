/**
 * Datos simulados de RF-IA-002 (inconsistencias con IA), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - 12 hallazgos ficticios (duplicados, valores atípicos, campos incompatibles y nombres no normalizados) en un
 *   almacén en memoria, con estados variados. Se pierde al recargar.
 * - Analizar añade de 2 a 4 hallazgos nuevos del conjunto elegido.
 * - Aceptar o descartar solo cambia el estado del hallazgo: los `campos` de los registros no cambian nunca
 *   (criterio 3: la IA no modifica registros oficiales).
 *
 * Escenarios con `?simular=`:
 * - `vacio`: el análisis no encuentra nada y la bandeja está vacía;
 * - `datos-insuficientes`: el análisis devuelve hallazgos con suficiencia parcial y faltantes;
 * - `ia-no-disponible`: al analizar, 503;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import type { Paginado } from '@/types/comun'
import type {
  ConjuntoDatos,
  ContenidoInconsistencia,
  CuerpoAceptarInconsistencia,
  FiltrosInconsistencias,
  NivelConfianza,
  PropuestaRevision,
  RegistroImplicado,
  ResultadoAnalisisInconsistencias,
  SolicitudAnalisisInconsistencias,
  SugerenciaInconsistencia,
  TipoHallazgo,
} from '@/types/inconsistenciasIa'
import { hoyLima } from '@/utils/instanteLima'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

interface Plantilla {
  conjunto: ConjuntoDatos
  tipo: TipoHallazgo
  campo: string | null
  valor: string | null
  registros: RegistroImplicado[]
  propuesta: PropuestaRevision
  confianza: NivelConfianza
  explicacion: string
}

const reg = (entidad: string, registro_id: number, codigo: string | null, etiqueta: string, campos: Record<string, string | null>): RegistroImplicado => ({
  entidad,
  registro_id,
  codigo,
  etiqueta,
  campos,
})

const PLANTILLAS: Plantilla[] = [
  {
    conjunto: 'Ejemplares',
    tipo: 'Duplicado',
    campo: 'Código',
    valor: 'EJ-00412 y EJ-00412-B',
    registros: [
      reg('ejemplar', 412, 'EJ-00412', 'Ficus (EJ-00412)', { Especie: 'Ficus', Espacio: 'Jardín Central', Coordenadas: '-12.06912, -77.07931', 'Estado sanitario': 'Estable', 'Fecha de registro': '12 mar. 2025' }),
      reg('ejemplar', 1412, 'EJ-00412-B', 'Ficus (EJ-00412-B)', { Especie: 'Ficus', Espacio: 'Jardín Central', Coordenadas: '-12.06913, -77.07931', 'Estado sanitario': 'Estable', 'Fecha de registro': '04 oct. 2026' }),
    ],
    propuesta: { descripcion: 'Conservar el ejemplar más antiguo y dar de baja el duplicado', campo: null, valor_propuesto: null, registro_conservar_id: 412 },
    confianza: 'Alta',
    explicacion: 'Misma especie y mismo espacio, con coordenadas a menos de 1 metro y un código que repite el anterior con el sufijo «-B».',
  },
  {
    conjunto: 'Atenciones',
    tipo: 'Duplicado',
    campo: 'Tipo, espacio y fecha',
    valor: 'Corte de césped · Tontódromo · 14 oct. 2026',
    registros: [
      reg('atencion', 9405, 'AT-2026-0405', 'AT-2026-0405', { Tipo: 'Corte de césped', Espacio: 'Tontódromo', Inicio: '14 oct. 2026, 08:00', Proveedor: 'Verde Campus S.A.C. (demo)', Metrado: '2 800 m²' }),
      reg('atencion', 9406, 'AT-2026-0406', 'AT-2026-0406', { Tipo: 'Corte de césped', Espacio: 'Tontódromo', Inicio: '14 oct. 2026, 08:15', Proveedor: 'Verde Campus S.A.C. (demo)', Metrado: '2 800 m²' }),
    ],
    propuesta: { descripcion: 'Conservar la primera atención y anular la segunda', campo: null, valor_propuesto: null, registro_conservar_id: 9405 },
    confianza: 'Media',
    explicacion: 'Dos atenciones del mismo tipo, en el mismo espacio y con 15 minutos de diferencia, con el mismo proveedor y metrado.',
  },
  {
    conjunto: 'Atenciones',
    tipo: 'ValorAtipico',
    campo: 'Metrado',
    valor: '48 000 m²',
    registros: [reg('atencion', 9388, 'AT-2026-0388', 'AT-2026-0388', { Tipo: 'Corte de césped', Espacio: 'Jardín de Letras', Metrado: '48 000 m²', 'Metrado habitual': '1 200 m²' })],
    propuesta: { descripcion: 'Revisar el metrado: probablemente se escribió con dos ceros de más', campo: 'Metrado', valor_propuesto: '480 m²', registro_conservar_id: null },
    confianza: 'Alta',
    explicacion: 'El metrado es 40 veces el habitual del espacio en los últimos 12 meses.',
  },
  {
    conjunto: 'Atenciones',
    tipo: 'ValorAtipico',
    campo: 'Duración',
    valor: '96 h',
    registros: [reg('atencion', 9371, 'AT-2026-0371', 'AT-2026-0371', { Tipo: 'Poda mayor programada', Inicio: '02 oct. 2026, 08:00', Fin: '06 oct. 2026, 08:00', 'Duración habitual': '6 h' })],
    propuesta: { descripcion: 'Comprobar la fecha de fin: la poda suele durar unas 6 horas', campo: 'Fin', valor_propuesto: '02 oct. 2026, 14:00', registro_conservar_id: null },
    confianza: 'Media',
    explicacion: 'La duración es 16 veces la mediana de las podas mayores del periodo.',
  },
  {
    conjunto: 'Atenciones',
    tipo: 'CamposIncompatibles',
    campo: 'Fin anterior al inicio',
    valor: 'Inicio 20 oct. 2026, 09:00 · Fin 19 oct. 2026, 17:00',
    registros: [reg('atencion', 9412, 'AT-2026-0412', 'AT-2026-0412', { Inicio: '20 oct. 2026, 09:00', Fin: '19 oct. 2026, 17:00', Estado: 'Reporte adjunto' })],
    propuesta: { descripcion: 'Corregir la fecha de fin', campo: 'Fin', valor_propuesto: '20 oct. 2026, 17:00', registro_conservar_id: null },
    confianza: 'Alta',
    explicacion: 'La fecha y hora de fin es anterior a la de inicio.',
  },
  {
    conjunto: 'Ejemplares',
    tipo: 'CamposIncompatibles',
    campo: 'Estado y atención posterior',
    valor: 'Muerto desde el 01 sept. 2026 · control fitosanitario el 15 oct. 2026',
    registros: [
      reg('ejemplar', 318, 'EJ-00318', 'Molle (EJ-00318)', { Estado: 'Muerto', 'Desde': '01 sept. 2026' }),
      reg('atencion', 9399, 'AT-2026-0399', 'AT-2026-0399', { Tipo: 'Control fitosanitario', Ejemplar: 'EJ-00318', Inicio: '15 oct. 2026, 10:00' }),
    ],
    propuesta: { descripcion: 'Revisar el estado del ejemplar o el ejemplar de la atención', campo: 'Estado', valor_propuesto: 'Estable o sin afectación registrada', registro_conservar_id: null },
    confianza: 'Media',
    explicacion: 'Un ejemplar marcado como muerto no debería recibir una atención fitosanitaria posterior.',
  },
  {
    conjunto: 'AreasVerdes',
    tipo: 'NombreNoNormalizado',
    campo: 'Nombre',
    valor: 'Jardin central · JARDÍN CENTRAL · Jardín Central',
    registros: [
      reg('area_verde', 11, null, 'Jardín Central', { Nombre: 'Jardín Central', Sector: 'Centro' }),
      reg('area_verde', 31, null, 'Jardin central', { Nombre: 'Jardin central', Sector: 'Centro' }),
      reg('area_verde', 32, null, 'JARDÍN CENTRAL', { Nombre: 'JARDÍN CENTRAL', Sector: 'Centro' }),
    ],
    propuesta: { descripcion: 'Unificar el nombre del espacio', campo: 'Nombre', valor_propuesto: 'Jardín Central', registro_conservar_id: 11 },
    confianza: 'Alta',
    explicacion: 'Los tres nombres solo difieren en tildes y mayúsculas, y están en el mismo sector.',
  },
  {
    conjunto: 'Proveedores',
    tipo: 'NombreNoNormalizado',
    campo: 'Razón social',
    valor: 'Verde Campus SAC',
    registros: [
      reg('proveedor', 101, null, 'Verde Campus S.A.C. (demo)', { 'Razón social': 'Verde Campus S.A.C. (demo)', Contratos: '1' }),
      reg('proveedor', 131, null, 'Verde Campus SAC', { 'Razón social': 'Verde Campus SAC', Contratos: '0' }),
    ],
    propuesta: { descripcion: 'Unificar la razón social', campo: 'Razón social', valor_propuesto: 'Verde Campus S.A.C. (demo)', registro_conservar_id: 101 },
    confianza: 'Media',
    explicacion: 'Las dos razones sociales coinciden salvo por la puntuación de «S.A.C.».',
  },
  {
    conjunto: 'AreasVerdes',
    tipo: 'Duplicado',
    campo: 'Nombre',
    valor: 'Bosque de Ficus',
    registros: [
      reg('area_verde', 16, null, 'Bosque de Ficus', { Nombre: 'Bosque de Ficus', Sector: 'Norte', Superficie: '3 400 m²' }),
      reg('area_verde', 36, null, 'Bosque de Ficus', { Nombre: 'Bosque de Ficus', Sector: 'Norte', Superficie: '3 380 m²' }),
    ],
    propuesta: { descripcion: 'Conservar el espacio con más atenciones', campo: null, valor_propuesto: null, registro_conservar_id: 16 },
    confianza: 'Media',
    explicacion: 'Mismo nombre y sector, con superficies casi iguales.',
  },
  {
    conjunto: 'Ejemplares',
    tipo: 'ValorAtipico',
    campo: 'Altura',
    valor: '85 m',
    registros: [reg('ejemplar', 205, 'EJ-00205', 'Palmera real (EJ-00205)', { Especie: 'Palmera real', Altura: '85 m', 'Altura habitual': '8 a 15 m' })],
    propuesta: { descripcion: 'Revisar la altura: probablemente son 8,5 m', campo: 'Altura', valor_propuesto: '8,5 m', registro_conservar_id: null },
    confianza: 'Alta',
    explicacion: 'La altura supera con mucho la máxima registrada para la especie.',
  },
  {
    conjunto: 'Atenciones',
    tipo: 'CamposIncompatibles',
    campo: 'Estado sin fin',
    valor: 'Conforme / cerrado sin fecha de fin',
    registros: [reg('atencion', 9360, 'AT-2026-0360', 'AT-2026-0360', { Estado: 'Conforme / cerrado', Inicio: '28 sept. 2026, 08:00', Fin: null })],
    propuesta: { descripcion: 'Registrar la fecha de fin de la atención', campo: 'Fin', valor_propuesto: null, registro_conservar_id: null },
    confianza: 'Baja',
    explicacion: 'Una atención cerrada debería tener fecha de fin.',
  },
  {
    conjunto: 'Proveedores',
    tipo: 'Duplicado',
    campo: 'RUC',
    valor: '20601234567',
    registros: [
      reg('proveedor', 102, null, 'Arbolistas del Sur E.I.R.L. (demo)', { 'Razón social': 'Arbolistas del Sur E.I.R.L. (demo)', RUC: '20601234567', Activo: 'Sí' }),
      reg('proveedor', 132, null, 'Arbolistas Sur', { 'Razón social': 'Arbolistas Sur', RUC: '20601234567', Activo: 'No' }),
    ],
    propuesta: { descripcion: 'Conservar el proveedor activo', campo: null, valor_propuesto: null, registro_conservar_id: 102 },
    confianza: 'Alta',
    explicacion: 'Dos proveedores con el mismo RUC.',
  },
]

const DATOS_UTILIZADOS: Record<ConjuntoDatos, string> = {
  Atenciones: 'Atenciones de los últimos 3 meses: 128 registros',
  Ejemplares: 'Ejemplares registrados: 1 240 registros',
  AreasVerdes: 'Áreas verdes y jardines: 86 registros',
  Proveedores: 'Proveedores: 14 registros',
}

function contenidoDe(p: Plantilla, parcial: boolean, instante: string): ContenidoInconsistencia {
  return {
    version_contenido: 1,
    ia: { proveedor: 'Simulado', modelo: 'demo-inconsistencias', solicitado_en: instante, duracion_ms: 3100 },
    suficiencia: parcial ? 'parcial' : 'suficiente',
    faltantes: parcial ? ['Las coordenadas de 210 ejemplares no están registradas', 'El metrado habitual se calcula con menos de 3 meses de datos'] : [],
    datos_utilizados: [DATOS_UTILIZADOS[p.conjunto]],
    limitaciones: ['La IA solo señala posibles problemas: puede haber falsos positivos', 'Ningún registro se modifica desde esta pantalla'],
    explicacion: p.explicacion,
    conjunto: p.conjunto,
    tipo_hallazgo: p.tipo,
    campo_observado: p.campo,
    valor_observado: p.valor,
    registros: p.registros,
    propuesta: p.propuesta,
    confianza: p.confianza,
    decision: null,
  }
}

function crear(id: number, p: Plantilla, instante: string, parcial = false): SugerenciaInconsistencia {
  const principal = p.registros[0]
  return {
    id,
    tipo: 'Inconsistencia',
    entidad: principal.entidad,
    registro_id: principal.registro_id,
    archivo_id: null,
    contenido: contenidoDe(p, parcial, instante),
    estado: 'Propuesta',
    etiqueta_estado: 'Pendiente de revisión',
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: instante,
    usuario_creacion_id: 1,
    fecha_modificacion: instante,
    usuario_modificacion_id: 1,
  }
}

function haceDias(dias: number, hora: string): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return `${new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)}T${hora}:00-05:00`
}

function iniciales(): SugerenciaInconsistencia[] {
  return PLANTILLAS.map((p, i) => {
    const s = crear(i + 1, p, haceDias(1 + i, `${String(8 + (i % 9)).padStart(2, '0')}:20`))
    // Las 3 más antiguas ya están decididas: dos aceptadas y una descartada.
    if (i === 9 || i === 11) {
      Object.assign(s, { estado: 'Validada', etiqueta_estado: 'Validada', validador_id: 1, fecha_validacion: haceDias(i - 2, '12:00') })
      s.contenido.decision = { accion: 'aceptar', valor_final: p.propuesta.valor_propuesto, comentario: 'Corregido en su módulo' }
    }
    if (i === 10) {
      Object.assign(s, { estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: haceDias(i - 2, '12:00') })
      s.contenido.decision = { accion: 'descartar', valor_final: null, comentario: 'La atención se cerró sin fin por un error ya conocido' }
    }
    return s
  })
}

const almacen = crearAlmacenSimulado(iniciales())

/** `GET ia/inconsistencias/` simulado. */
export function simularListarInconsistencias(filtros: FiltrosInconsistencias, signal?: AbortSignal) {
  return responderSimulado<Paginado<SugerenciaInconsistencia>>(() => {
    const todas =
      escenarioSimulado() === 'vacio'
        ? []
        : almacen
            .listar()
            .filter(
              (s) =>
                (!filtros.estado || s.estado === filtros.estado) &&
                (!filtros.tipo_hallazgo || s.contenido.tipo_hallazgo === filtros.tipo_hallazgo) &&
                (!filtros.conjunto || s.contenido.conjunto === filtros.conjunto),
            )
            .sort((a, b) => (b.fecha_creacion ?? '').localeCompare(a.fecha_creacion ?? '') || b.id - a.id)
    const pagina = Math.max(1, filtros.page ?? 1)
    return {
      count: todas.length,
      next: pagina * POR_PAGINA < todas.length ? `?page=${pagina + 1}` : null,
      previous: pagina > 1 ? `?page=${pagina - 1}` : null,
      results: todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    }
  }, { signal })
}

/** Analiza un conjunto: de 2 a 4 hallazgos nuevos (exportado para las pruebas). */
export function analizarSimulado(solicitud: SolicitudAnalisisInconsistencias, ahora: Date = new Date()): ResultadoAnalisisInconsistencias {
  const escenario = escenarioSimulado()
  const analisisId = 500 + almacen.siguienteId()
  if (escenario === 'vacio') return { analisis_id: analisisId, hallazgos: 0, sugerencias: [] }
  const delConjunto = PLANTILLAS.filter((p) => p.conjunto === solicitud.conjunto)
  const cantidad = Math.min(delConjunto.length, 2 + (almacen.siguienteId() % 3))
  const instante = ahora.toISOString()
  const sugerencias = delConjunto
    .slice(0, cantidad)
    .map((p) => almacen.guardar(crear(almacen.siguienteId(), p, instante, escenario === 'datos-insuficientes')))
  return { analisis_id: analisisId, hallazgos: sugerencias.length, sugerencias }
}

/** `POST ia/inconsistencias/analisis/` simulado (llamada de IA: admite `?simular=ia-no-disponible`). */
export function simularAnalizarInconsistencias(solicitud: SolicitudAnalisisInconsistencias) {
  return responderSimulado(() => analizarSimulado(solicitud), { esIa: true, demoraMs: 1500 })
}

function buscar(id: number): SugerenciaInconsistencia {
  const s = almacen.obtener(id)
  if (!s) throw errorNoEncontrado()
  return s
}

/** `GET ia/inconsistencias/{id}/` simulado. */
export function simularObtenerInconsistencia(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

const YA_REVISADO = 'Este hallazgo ya fue revisado. Recarga la página para ver su estado.'

/** Decide el hallazgo: solo cambia su estado, nunca los registros (exportado para las pruebas). */
export function decidirSimulado(
  id: number,
  decision: { accion: 'aceptar' | 'descartar'; valor_final: string | null; comentario: string | null },
  ahora: Date = new Date(),
): SugerenciaInconsistencia {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADO)
  const instante = ahora.toISOString()
  const aceptada = decision.accion === 'aceptar'
  return almacen.guardar({
    ...s,
    estado: aceptada ? 'Validada' : 'Rechazada',
    etiqueta_estado: aceptada ? 'Validada' : 'Rechazada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: { ...s.contenido, decision },
  })
}

/** `POST ia/inconsistencias/{id}/validar/` simulado. */
export function simularAceptarInconsistencia(id: number, cuerpo: CuerpoAceptarInconsistencia) {
  return responderSimulado(() => {
    const valor = cuerpo.valor_final ?? buscar(id).contenido.propuesta.valor_propuesto
    return decidirSimulado(id, { accion: 'aceptar', valor_final: valor, comentario: cuerpo.comentario ?? null })
  })
}

/** `POST ia/inconsistencias/{id}/rechazar/` simulado. */
export function simularDescartarInconsistencia(id: number, motivo: string | null) {
  return responderSimulado(() => decidirSimulado(id, { accion: 'descartar', valor_final: null, comentario: motivo }))
}
