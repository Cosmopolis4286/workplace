import { useApi } from '../core/useApi'

interface PublicTestimonial {
  id: string
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
  createdAt?: string
}

interface PublicStat {
  key?: string
  value: string
  label: string
  rawValue?: number
}

interface PublicFeature {
  id: string
  title: string
  description: string
  icon: string
  bg: string
}

interface PublicStep {
  id: string
  title: string
  desc: string
  icon: string
}

// Fallbacks shown while loading or if the API is unreachable
const FALLBACK_TESTIMONIALS: PublicTestimonial[] = [
  {
    id: '1',
    quote: 'Desde que usamos WorkPlace Manager nuestros tiempos de servicio mejoraron un 40%. El módulo de pedidos es increíblemente intuitivo.',
    name: 'Laura Martínez',
    role: 'Dueña, Restaurante El Sabor',
    initials: 'LM',
    avatarColor: '#EF4444',
  },
  {
    id: '2',
    quote: 'Como diseñadora independiente, poder recibir y gestionar solicitudes de servicio desde un solo panel me ahorra horas cada semana.',
    name: 'Roberto Núñez',
    role: 'Freelancer, Diseño Gráfico',
    initials: 'RN',
    avatarColor: '#8B5CF6',
  },
  {
    id: '3',
    quote: 'Los reportes de analytics nos ayudaron a identificar nuestros productos estrella y duplicar su disponibilidad.',
    name: 'Ana Torres',
    role: 'Gerente, Farmacia Bella Napoli',
    initials: 'AT',
    avatarColor: '#14B8A6',
  },
]

const FALLBACK_STATS: PublicStat[] = [
  { key: 'commerces', value: '500+', label: 'Comercios activos', rawValue: 500 },
  { key: 'uptime', value: '99.9%', label: 'Tiempo en línea' },
  { key: 'orders', value: '50k+', label: 'Pedidos procesados', rawValue: 50000 },
  { key: 'rating', value: '4.9★', label: 'Valoración promedio', rawValue: 500 },
  { key: 'support', value: '24/7', label: 'Soporte disponible' },
]

const FALLBACK_FEATURES: PublicFeature[] = [
  { id: '1', title: 'Gestión de Pedidos', description: 'Recibe y gestiona todos tus pedidos en tiempo real. Controla estados, tiempos y asignaciones desde un solo panel.', icon: 'ShoppingCartIcon', bg: 'bg-blue-500' },
  { id: '2', title: 'Control de Inventario', description: 'Monitorea tu stock al instante. Recibe alertas automáticas de bajo inventario y evita pérdidas operativas.', icon: 'CubeIcon', bg: 'bg-violet-500' },
  { id: '3', title: 'Menú Digital', description: 'Crea y actualiza tu menú con fotos, precios, categorías y disponibilidad en tiempo real.', icon: 'DocumentTextIcon', bg: 'bg-green-500' },
  { id: '4', title: 'Analytics y Reportes', description: 'Visualiza el rendimiento de tu negocio con gráficas, KPIs e informes exportables.', icon: 'ChartBarIcon', bg: 'bg-amber-500' },
  { id: '5', title: 'CRM de Clientes', description: 'Conoce a tus clientes: historial de pedidos, segmentos, frecuencia y valor de vida.', icon: 'UsersIcon', bg: 'bg-pink-500' },
  { id: '6', title: 'Control de Delivery', description: 'Administra repartidores, rutas y tiempos de entrega. Asigna pedidos y haz seguimiento en vivo.', icon: 'TruckIcon', bg: 'bg-teal-500' },
]

const FALLBACK_STEPS: PublicStep[] = [
  { id: '1', title: 'Crea tu cuenta', desc: 'Regístrate gratis en menos de 2 minutos. Solo necesitas tu correo y el nombre de tu comercio.', icon: 'UserPlusIcon' },
  { id: '2', title: 'Configura tu negocio', desc: 'Agrega tu menú o servicios, productos y ajusta la configuración según tus necesidades operativas.', icon: 'CogIcon' },
  { id: '3', title: 'Comienza a gestionar', desc: 'Recibe pedidos, controla inventario y analiza el rendimiento de tu negocio en tiempo real.', icon: 'RocketLaunchIcon' },
]

type LandingSection = 'testimonials' | 'stats' | 'features' | 'steps'

export const useLandingContent = () => {
  const { get } = useApi()

  const testimonials = useState<PublicTestimonial[]>('landing-testimonials', () => FALLBACK_TESTIMONIALS)
  const stats = useState<PublicStat[]>('landing-stats', () => FALLBACK_STATS)
  const features = useState<PublicFeature[]>('landing-features', () => FALLBACK_FEATURES)
  const steps = useState<PublicStep[]>('landing-steps', () => FALLBACK_STEPS)
  const loading = useState('landing-loading', () => false)
  const loaded = useState('landing-loaded', () => false)
  const socketConnected = useState('landing-socket-connected', () => false)

  async function fetchSection(section: LandingSection) {
    switch (section) {
      case 'testimonials': {
        const t = await get<PublicTestimonial[]>('/landing/testimonials').catch(() => null)
        if (t && t.length > 0) testimonials.value = t
        break
      }
      case 'stats': {
        const s = await get<PublicStat[]>('/landing/stats').catch(() => null)
        if (s && s.length > 0) stats.value = s
        break
      }
      case 'features': {
        const f = await get<PublicFeature[]>('/landing/features').catch(() => null)
        if (f && f.length > 0) features.value = f
        break
      }
      case 'steps': {
        const st = await get<PublicStep[]>('/landing/steps').catch(() => null)
        if (st && st.length > 0) steps.value = st
        break
      }
    }
  }

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      await Promise.all([
        fetchSection('testimonials'),
        fetchSection('stats'),
        fetchSection('features'),
        fetchSection('steps'),
      ])
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // Realtime: el admin actualiza contenido y todos los visitantes lo ven sin recargar
  function connectRealtime() {
    if (!process.client || socketConnected.value) return
    const { $socketio } = useNuxtApp() as any
    const socket = $socketio.connect('/landing')
    socket.on('landing:update', ({ section }: { section: LandingSection }) => {
      fetchSection(section)
    })
    socketConnected.value = true
  }

  function disconnectRealtime() {
    if (!process.client || !socketConnected.value) return
    const { $socketio } = useNuxtApp() as any
    $socketio.disconnect()
    socketConnected.value = false
  }

  return { testimonials, stats, features, steps, loading, load, connectRealtime, disconnectRealtime }
}
