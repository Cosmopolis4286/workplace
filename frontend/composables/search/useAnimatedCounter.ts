import { ref } from 'vue'

export function useAnimatedCounter() {
  const value = ref(0)

  function animateTo(end: number, duration = 700) {
    const target = value
    const startVal = target.value
    const startTime = performance.now()
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      target.value = Math.round(startVal + (end - startVal) * (1 - Math.pow(1 - progress, 3)))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return { value, animateTo }
}
