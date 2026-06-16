interface PublicTestimonial {
  id: string
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
}

interface PublicStat {
  value: string
  label: string
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
    quote: 'El control de inventario nos ahorró miles al mes. Ahora nunca nos quedamos sin ingredientes clave en hora pico.',
    name: 'Roberto Núñez',
    role: 'Chef ejecutivo, Casa del Chef',
    initials: 'RN',
    avatarColor: '#8B5CF6',
  },
  {
    id: '3',
    quote: 'Los reportes de analytics nos ayudaron a identificar nuestros productos estrella y duplicar su disponibilidad.',
    name: 'Ana Torres',
    role: 'Gerente, Pizzería Bella Napoli',
    initials: 'AT',
    avatarColor: '#14B8A6',
  },
]

const FALLBACK_STATS: PublicStat[] = [
  { value: '500+', label: 'Restaurantes activos' },
  { value: '99.9%', label: 'Tiempo en línea' },
  { value: '50k+', label: 'Pedidos procesados' },
  { value: '4.9★', label: 'Valoración promedio' },
  { value: '24/7', label: 'Soporte disponible' },
]

export const useLandingContent = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl

  const testimonials = useState<PublicTestimonial[]>('landing-testimonials', () => FALLBACK_TESTIMONIALS)
  const stats = useState<PublicStat[]>('landing-stats', () => FALLBACK_STATS)
  const loading = ref(false)

  async function load() {
    if (loading.value) return
    loading.value = true
    try {
      const [t, s] = await Promise.all([
        $fetch<PublicTestimonial[]>(`${apiUrl}/landing/testimonials`).catch(() => null),
        $fetch<PublicStat[]>(`${apiUrl}/landing/stats`).catch(() => null),
      ])
      if (t && t.length > 0) testimonials.value = t
      if (s && s.length > 0) stats.value = s
    } finally {
      loading.value = false
    }
  }

  return { testimonials, stats, loading, load }
}
