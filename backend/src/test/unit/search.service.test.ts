import { detectBudget, detectNeedCategory } from '../../domains/commerce-core/search/search.service'

describe('detectBudget', () => {
  it('detecta monto con símbolo $', () => {
    expect(detectBudget('tengo $50 para esta semana')).toBe(50)
  })

  it('detecta "tengo X"', () => {
    expect(detectBudget('tengo 50 para esta semana')).toBe(50)
  })

  it('detecta "con X"', () => {
    expect(detectBudget('quiero comer con 30')).toBe(30)
  })

  it('detecta "hasta X"', () => {
    expect(detectBudget('busco algo hasta 20')).toBe(20)
  })

  it('detecta monto seguido de moneda', () => {
    expect(detectBudget('tengo 50 dolares')).toBe(50)
    expect(detectBudget('50 bs para el almuerzo')).toBe(50)
  })

  it('acepta decimales con coma o punto', () => {
    expect(detectBudget('tengo $50,50')).toBe(50.5)
    expect(detectBudget('tengo $50.50')).toBe(50.5)
  })

  it('retorna null si no hay monto', () => {
    expect(detectBudget('comida cerca de mi casa')).toBeNull()
  })

  it('retorna null para monto cero o negativo', () => {
    expect(detectBudget('tengo 0 disponible')).toBeNull()
  })
})

describe('detectNeedCategory', () => {
  it('detecta categoría comida', () => {
    expect(detectNeedCategory('tengo hambre y quiero almorzar')).toBe('comida')
  })

  it('detecta categoría hogar', () => {
    expect(detectNeedCategory('necesito un plomero para mi casa')).toBe('hogar')
  })

  it('detecta categoría ocio', () => {
    expect(detectNeedCategory('quiero organizar una fiesta de cumpleaños')).toBe('ocio')
  })

  it('es case-insensitive', () => {
    expect(detectNeedCategory('COMIDA para hoy')).toBe('comida')
  })

  it('retorna null si no matchea ninguna categoría', () => {
    expect(detectNeedCategory('programador freelance')).toBeNull()
  })
})
