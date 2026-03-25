import { ref, readonly, onMounted, onUnmounted } from 'vue'

export const useMobileDetection = () => {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)
  const touchSupported = ref(false)

  const updateDeviceType = () => {
    if (process.client) {
      const width = window.innerWidth
      
      // Breakpoints optimizados para mobile
      isMobile.value = width < 768
      isTablet.value = width >= 768 && width < 1024
      isDesktop.value = width >= 1024
      touchSupported.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
  }

  onMounted(() => {
    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceType)
  })

  return {
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
    isDesktop: readonly(isDesktop),
    touchSupported: readonly(touchSupported)
  }
}
