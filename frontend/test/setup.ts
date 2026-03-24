import { beforeAll, afterEach, afterAll } from 'vitest'

// Configuración global para tests
beforeAll(() => {
  // Mock global objects si es necesario
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })
})

afterEach(() => {
  // Cleanup después de cada test
})

afterAll(() => {
  // Cleanup final
})
