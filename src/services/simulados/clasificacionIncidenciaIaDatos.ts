/**
 * Incidencias ficticias de los datos simulados de RF-IA-005 (solo con `VITE_DATOS_SIMULADOS=true`): cada una con la
 * sugerencia que daría la IA, sus motivos por campo y sus antecedentes. Sin datos personales reales.
 */
import type { AntecedenteIncidencia, ContenidoClasificacion, IncidenciaResumen, ValoresClasificacion } from '@/types/clasificacionIncidenciaIa'
import { hoyLima } from '@/utils/instanteLima'

export function haceDias(dias: number): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

export interface IncidenciaSimulada {
  incidencia: IncidenciaResumen
  sugerencia: ValoresClasificacion
  motivos: ContenidoClasificacion['motivos']
  antecedentes: AntecedenteIncidencia[]
  /** Poca evidencia: sin fotos y con una descripción muy corta. */
  insuficiente?: boolean
}

const fotos = (n: number, base: number) =>
  Array.from({ length: n }, (_, i) => ({ archivo_id: base + i, nombre: `foto-${base + i}.jpg`, url_miniatura: null }))

function incidencia(
  id: number,
  codigo: string,
  dias: number,
  descripcion: string,
  canal: string,
  espacio: string | null,
  ejemplar: IncidenciaResumen['ejemplar'],
  nFotos: number,
  tipo: IncidenciaResumen['tipo_evento'] = 'Incidencia',
): IncidenciaResumen {
  return { id, codigo, fecha_recepcion: haceDias(dias), tipo_evento: tipo, descripcion, canal_ingreso: canal, espacio, ejemplar, fotografias: fotos(nFotos, id * 10), estado: 'Registrada' }
}

export const INCIDENCIAS: IncidenciaSimulada[] = [
  {
    incidencia: incidencia(231, 'OSG-0231', 0, 'Rama de Ficus a punto de caer sobre la vereda junto a la Biblioteca', 'Formulario web', 'Jardín Central', { id: 412, codigo: 'EJ-00412', especie: 'Ficus' }, 2),
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Arbolado', severidad: 'Alta', via_atencion: 'Tercerizado', es_sencilla: false },
    motivos: {
      tipo_evento: 'Es un evento imprevisto en un ejemplar, no un reclamo ni un hallazgo',
      categoria: 'Afecta a un árbol (rama de Ficus)',
      severidad: 'Rama sobre una vereda con paso de personas: riesgo de caída',
      via_atencion: 'Requiere poda de altura con equipo especializado',
      es_sencilla: 'La poda de altura necesita programar al proveedor',
    },
    antecedentes: [{ codigo: 'OSG-0198', fecha: haceDias(40), tipo_evento: 'Incidencia', severidad: 'Media' }],
  },
  {
    incidencia: incidencia(232, 'OSG-0232', 1, 'Aspersor roto en el Jardín Central inunda el pasillo', 'Correo', 'Jardín Central', null, 1),
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Riego', severidad: 'Media', via_atencion: 'PersonalPropio', es_sencilla: true },
    motivos: {
      tipo_evento: 'Fallo de un equipo de riego',
      categoria: 'Aspersor del sistema de riego',
      severidad: 'Inunda un pasillo: molestia y riesgo de resbalones, sin daño grave',
      via_atencion: 'La cuadrilla cambia aspersores habitualmente',
      es_sencilla: 'El cambio de un aspersor se hace en el día',
    },
    antecedentes: [
      { codigo: 'OSG-0187', fecha: haceDias(60), tipo_evento: 'Incidencia', severidad: 'Baja' },
      { codigo: 'OSG-0203', fecha: haceDias(25), tipo_evento: 'Incidencia', severidad: 'Media' },
    ],
  },
  {
    incidencia: incidencia(233, 'OSG-0233', 1, 'Reclamo por ruido de podadora durante exámenes en el Pabellón de Letras', 'Mesa de partes', 'Plaza de Letras', null, 0, 'Reclamo'),
    sugerencia: { tipo_evento: 'Reclamo', categoria: 'Programación', severidad: 'Baja', via_atencion: 'PersonalPropio', es_sencilla: true },
    motivos: {
      tipo_evento: 'Lo presenta un miembro de la comunidad por una molestia',
      categoria: 'Horario de los trabajos',
      severidad: 'No hay riesgo para personas ni para el patrimonio',
      via_atencion: 'Basta con reprogramar el trabajo de la cuadrilla',
    },
    antecedentes: [],
  },
  {
    incidencia: incidencia(234, 'OSG-0234', 2, 'Manchas blancas en hojas de palmeras de la Explanada', 'Supervisión de campo', 'Explanada de Ciencias', { id: 205, codigo: 'EJ-00205', especie: 'Palmera real' }, 3, 'Hallazgo de supervisión'),
    sugerencia: { tipo_evento: 'Hallazgo de supervisión', categoria: 'Plagas', severidad: 'Media', via_atencion: 'Tercerizado', es_sencilla: false },
    motivos: {
      tipo_evento: 'Lo detectó la supervisión de campo',
      categoria: 'Las manchas blancas sugieren cochinilla o queresa',
      severidad: 'Afecta a varios ejemplares, sin riesgo inmediato',
      via_atencion: 'Necesita control fitosanitario del proveedor',
    },
    antecedentes: [
      { codigo: 'OSG-0176', fecha: haceDias(90), tipo_evento: 'Hallazgo de supervisión', severidad: 'Media' },
      { codigo: 'OSG-0190', fecha: haceDias(55), tipo_evento: 'Incidencia', severidad: 'Baja' },
      { codigo: 'OSG-0207', fecha: haceDias(20), tipo_evento: 'Hallazgo de supervisión', severidad: 'Media' },
    ],
  },
  {
    incidencia: incidencia(235, 'OSG-0235', 2, 'Banca rota en el Tontódromo junto al jardín de flores', 'Formulario web', 'Tontódromo', null, 1),
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Infraestructura', severidad: 'Baja', via_atencion: 'PersonalPropio', es_sencilla: true },
    motivos: {
      tipo_evento: 'Daño en el mobiliario de un espacio',
      categoria: 'Mobiliario del jardín',
      severidad: 'Sin riesgo inmediato: se puede señalizar',
      via_atencion: 'La cuadrilla puede retirarla y reponerla',
    },
    antecedentes: [],
  },
  {
    incidencia: incidencia(236, 'OSG-0236', 3, 'Problema en jardín', 'Teléfono', null, null, 0),
    sugerencia: { tipo_evento: 'Incidencia', categoria: null, severidad: null, via_atencion: 'PersonalPropio', es_sencilla: null },
    motivos: { tipo_evento: 'Por defecto, al no haber más información', via_atencion: 'Por defecto, mientras no se sepa más' },
    antecedentes: [],
    insuficiente: true,
  },
  {
    incidencia: incidencia(237, 'OSG-0237', 4, 'No conformidad: el proveedor dejó residuos de poda en el Jardín de Ingeniería', 'Supervisión de campo', 'Jardín de Ingeniería', null, 2, 'No conformidad'),
    sugerencia: { tipo_evento: 'No conformidad', categoria: 'Limpieza', severidad: 'Media', via_atencion: 'Tercerizado', es_sencilla: true },
    motivos: {
      tipo_evento: 'Incumplimiento de un servicio contratado',
      categoria: 'Residuos tras el servicio',
      severidad: 'Afecta al uso del espacio, sin riesgo',
      via_atencion: 'Le corresponde corregirlo al proveedor',
    },
    antecedentes: [{ codigo: 'OSG-0201', fecha: haceDias(30), tipo_evento: 'No conformidad', severidad: 'Baja' }],
  },
  {
    incidencia: incidencia(238, 'OSG-0238', 5, 'Molle inclinado tras el viento, con raíces levantadas cerca del estacionamiento', 'Formulario web', 'Bosque de Ficus', { id: 318, codigo: 'EJ-00318', especie: 'Molle' }, 2),
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Arbolado', severidad: 'Alta', via_atencion: 'Tercerizado', es_sencilla: false },
    motivos: {
      tipo_evento: 'Evento imprevisto en un ejemplar',
      categoria: 'Estabilidad de un árbol',
      severidad: 'Riesgo de caída sobre vehículos y personas',
      via_atencion: 'Necesita evaluación y poda o retiro especializados',
    },
    antecedentes: [],
  },
]

/** Incidencias ya clasificadas antes (para los análisis iniciales). */
export const CLASIFICADAS: IncidenciaSimulada[] = [
  {
    incidencia: { ...incidencia(221, 'OSG-0221', 8, 'Tubería de riego rota en la Plaza de Letras', 'Correo', 'Plaza de Letras', null, 1), estado: 'Clasificada' },
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Riego', severidad: 'Media', via_atencion: 'PersonalPropio', es_sencilla: true },
    motivos: { severidad: 'Pérdida de agua continua' },
    antecedentes: [],
  },
  {
    incidencia: { ...incidencia(222, 'OSG-0222', 9, 'Hallazgo de auditoría: falta señalización en zona de poda', 'Auditoría', 'Tontódromo', null, 0, 'Hallazgo de auditoría'), estado: 'Clasificada' },
    sugerencia: { tipo_evento: 'Hallazgo de auditoría', categoria: 'Seguridad', severidad: 'Alta', via_atencion: 'Tercerizado', es_sencilla: true },
    motivos: { severidad: 'Riesgo para personas durante los trabajos' },
    antecedentes: [],
  },
  {
    incidencia: incidencia(225, 'OSG-0225', 7, 'Hojas secas acumuladas en la Explanada', 'Teléfono', 'Explanada de Ciencias', null, 1),
    sugerencia: { tipo_evento: 'Incidencia', categoria: 'Limpieza', severidad: 'Baja', via_atencion: 'PersonalPropio', es_sencilla: true },
    motivos: { severidad: 'Sin riesgo' },
    antecedentes: [],
  },
]
