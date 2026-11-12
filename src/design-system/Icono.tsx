/**
 * Icono: iconos lucide del sistema de diseño de Figma (DESIGN.md, 4.5), con `lucide-react` (D3).
 *
 * Los nombres son los de la página de iconos de Figma (`house`, `calendar`, `triangle-alert`…), para que la
 * correspondencia sea directa. Los nombres antiguos de la Guía Web (`aspa`, `triangulo`…) siguen como alias.
 * Usan `currentColor`, así que toman el color del texto. Tamaños: `base` 16px (el de Figma), `md` 20px y
 * `sm` 13px (insignias).
 *
 * Accesibilidad: sin `titulo` es decorativo (`aria-hidden`), porque siempre acompaña a un texto.
 * Con `titulo` se anuncia como imagen.
 *
 * Para añadir un icono: primero en la página de iconos de Figma, después aquí con el mismo nombre.
 */
import {
  ArrowRightLeft,
  ArrowUpDown,
  Bell,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleCheck,
  CirclePlus,
  CircleX,
  Clipboard,
  Download,
  Ellipsis,
  Eye,
  FileText,
  Funnel,
  House,
  Image,
  Info,
  LayoutDashboard,
  Leaf,
  List,
  Loader,
  Locate,
  Map as Mapa,
  MapPin,
  Menu,
  Moon,
  PanelLeft,
  Paperclip,
  Pause,
  Plus,
  RefreshCw,
  Repeat,
  Scissors,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TreeDeciduous,
  TriangleAlert,
  Truck,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import estilos from './Icono.module.css'

/** Iconos de la página «Iconos» del sistema de diseño de Figma, con su nombre de Figma. */
const ICONOS_FIGMA = {
  'arrow-right-left': ArrowRightLeft,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  chart: ChartColumn,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevrons-up-down': ChevronsUpDown,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  clipboard: Clipboard,
  dashboard: LayoutDashboard,
  download: Download,
  ellipsis: Ellipsis,
  eye: Eye,
  filter: Funnel,
  house: House,
  image: Image,
  info: Info,
  leaf: Leaf,
  list: List,
  loader: Loader,
  locate: Locate,
  map: Mapa,
  'map-pin': MapPin,
  menu: Menu,
  moon: Moon,
  'panel-left': PanelLeft,
  paperclip: Paperclip,
  pause: Pause,
  plus: Plus,
  'plus-circle': CirclePlus,
  refresh: RefreshCw,
  repeat: Repeat,
  scissors: Scissors,
  search: Search,
  settings: Settings,
  sliders: SlidersHorizontal,
  sun: Sun,
  tree: TreeDeciduous,
  'triangle-alert': TriangleAlert,
  truck: Truck,
  'wifi-off': WifiOff,
  x: X,
} satisfies Record<string, LucideIcon>

/** Nombres antiguos de la Guía Web: no los uses en código nuevo. */
const ALIAS_ANTIGUOS = {
  circulo: Circle,
  verificacion: Check,
  triangulo: TriangleAlert,
  aspa: X,
  flechaOrden: ArrowUpDown,
  chevronDerecha: ChevronRight,
  documento: FileText,
  destello: Sparkles,
} satisfies Record<string, LucideIcon>

const ICONOS: Record<NombreIcono, LucideIcon> = { ...ICONOS_FIGMA, ...ALIAS_ANTIGUOS }

export type NombreIconoFigma = keyof typeof ICONOS_FIGMA
export type NombreIcono = NombreIconoFigma | keyof typeof ALIAS_ANTIGUOS

/** Nombres de los iconos de Figma, en el orden de su página (para pruebas y catálogos). */
export const NOMBRES_ICONOS_FIGMA = Object.keys(ICONOS_FIGMA) as NombreIconoFigma[]

export interface IconoProps {
  nombre: NombreIcono
  /** `md`: 20px (por defecto); `base`: 16px, el de Figma (botones y menú); `sm`: 13px, para insignias. */
  tamano?: 'md' | 'base' | 'sm'
  /** Texto accesible. Solo si el icono va sin texto visible al lado. */
  titulo?: string
  className?: string
}

export default function Icono({ nombre, tamano = 'md', titulo, className }: IconoProps) {
  const Componente = ICONOS[nombre]
  return (
    <Componente
      className={[estilos.icono, estilos[tamano], className].filter(Boolean).join(' ')}
      strokeWidth={2}
      focusable="false"
      {...(titulo ? { role: 'img', 'aria-label': titulo, 'aria-hidden': false } : { 'aria-hidden': true })}
    />
  )
}
