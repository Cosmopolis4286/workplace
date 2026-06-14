interface TouchPoint {
  x: number
  y: number
  time: number
}

interface SwipeConfig {
  threshold: number
  restraint: number
  allowedTime: number
}

export const useTouchGestures = (element: Ref<HTMLElement | null>) => {
  const touchStart = ref<TouchPoint | null>(null)
  const touchEnd = ref<TouchPoint | null>(null)
  
  const swipeConfig: SwipeConfig = {
    threshold: 100,  // Mínima distancia para swipe
    restraint: 100,   // Máxima distancia perpendicular
    allowedTime: 300  // Máximo tiempo para swipe
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (!element.value) return
    
    const touch = e.touches[0]
    touchStart.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    // Prevenir scroll durante swipe horizontal
    if (touchStart.value) {
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStart.value.x)
      const deltaY = Math.abs(touch.clientY - touchStart.value.y)
      
      // Si el movimiento es más horizontal que vertical, prevenir scroll
      if (deltaX > deltaY && deltaX > 50) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.value || !element.value) return
    
    const touch = e.changedTouches[0]
    touchEnd.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    
    // Detectar swipe
    const elapsedTime = touchEnd.value.time - touchStart.value.time
    const deltaX = touchEnd.value.x - touchStart.value.x
    const deltaY = touchEnd.value.y - touchStart.value.y
    
    if (elapsedTime <= swipeConfig.allowedTime) {
      if (Math.abs(deltaX) >= swipeConfig.threshold && Math.abs(deltaY) <= swipeConfig.restraint) {
        // Swipe horizontal
        const direction = deltaX > 0 ? 'right' : 'left'
        element.value.dispatchEvent(new CustomEvent('swipe', {
          detail: { direction, deltaX, deltaY }
        }))
      } else if (Math.abs(deltaY) >= swipeConfig.threshold && Math.abs(deltaX) <= swipeConfig.restraint) {
        // Swipe vertical
        const direction = deltaY > 0 ? 'down' : 'up'
        element.value.dispatchEvent(new CustomEvent('swipe', {
          detail: { direction, deltaX, deltaY }
        }))
      }
    }
    
    touchStart.value = null
    touchEnd.value = null
  }

  const handleClick = (e: MouseEvent) => {
    // Asegurar que los clicks funcionen bien después de gestos
    if (touchStart.value) {
      e.preventDefault()
    }
  }

  onMounted(() => {
    if (element.value) {
      element.value.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.value.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.value.addEventListener('touchend', handleTouchEnd, { passive: false })
      element.value.addEventListener('click', handleClick)
    }
  })

  onUnmounted(() => {
    if (element.value) {
      element.value.removeEventListener('touchstart', handleTouchStart)
      element.value.removeEventListener('touchmove', handleTouchMove)
      element.value.removeEventListener('touchend', handleTouchEnd)
      element.value.removeEventListener('click', handleClick)
    }
  })

  return {
    touchStart: readonly(touchStart),
    touchEnd: readonly(touchEnd)
  }
}

// Hook para pull-to-refresh
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const isPulling = ref(false)
  
  const startY = ref(0)
  const currentY = ref(0)
  
  const maxPullDistance = 80
  const triggerDistance = 60

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.value = e.touches[0].clientY
      isPulling.value = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.value || isRefreshing.value) return
    
    currentY.value = e.touches[0].clientY
    const distance = currentY.value - startY.value
    
    if (distance > 0) {
      e.preventDefault()
      pullDistance.value = Math.min(distance * 0.5, maxPullDistance)
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.value) return
    
    if (pullDistance.value >= triggerDistance && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }
    
    pullDistance.value = 0
    isPulling.value = false
    startY.value = 0
    currentY.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    isRefreshing: readonly(isRefreshing),
    pullDistance: readonly(pullDistance),
    isPulling: readonly(isPulling)
  }
}
