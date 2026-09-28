import { USER_CATEGORIES, SERVICE_CATEGORIES, JOB_CATEGORIES } from '../../../prisma/data/catalog-categories.js'

// Regresión del bug de "Comida": una UserCategory con 'services'/'jobs' en
// allowedModules pero sin ninguna ServiceCategory/JobCategory sembrada deja
// al usuario con el módulo habilitado (PlanLimitsService, incluido el
// ensanchado por accountType FREELANCER/SERVICE_PROVIDER) pero el selector
// de categoría vacío. Este test falla si se repite ese hueco al agregar o
// modificar categorías en prisma/data/catalog-categories.js.
describe('catalog-categories.data — coherencia de seed', () => {
  const userCategoryNames = new Set(USER_CATEGORIES.map((c) => c.name))

  function categoriesWithModule(module: string): string[] {
    return USER_CATEGORIES.filter((c) => c.allowedModules.includes(module)).map((c) => c.name)
  }

  function seededNames(entries: { userCategories: string[] }[]): Set<string> {
    return new Set(entries.flatMap((e) => e.userCategories))
  }

  it('cada UserCategory con módulo "services" tiene al menos una ServiceCategory que la referencia', () => {
    const withServices = categoriesWithModule('services')
    const seeded = seededNames(SERVICE_CATEGORIES)

    const missing = withServices.filter((name) => !seeded.has(name))

    expect(missing).toEqual([])
  })

  it('cada UserCategory con módulo "jobs" tiene al menos una JobCategory que la referencia', () => {
    const withJobs = categoriesWithModule('jobs')
    const seeded = seededNames(JOB_CATEGORIES)

    const missing = withJobs.filter((name) => !seeded.has(name))

    expect(missing).toEqual([])
  })

  it('SERVICE_CATEGORIES no referencia ninguna UserCategory inexistente (typo en el nombre)', () => {
    const invalidRefs = SERVICE_CATEGORIES.flatMap((sc) =>
      sc.userCategories.filter((name: string) => !userCategoryNames.has(name)).map((name: string) => `${sc.name} → ${name}`)
    )

    expect(invalidRefs).toEqual([])
  })

  it('JOB_CATEGORIES no referencia ninguna UserCategory inexistente (typo en el nombre)', () => {
    const invalidRefs = JOB_CATEGORIES.flatMap((jc) =>
      jc.userCategories.filter((name: string) => !userCategoryNames.has(name)).map((name: string) => `${jc.name} → ${name}`)
    )

    expect(invalidRefs).toEqual([])
  })

  it('no hay nombres de UserCategory duplicados', () => {
    const names = USER_CATEGORIES.map((c) => c.name)
    expect(names.length).toBe(new Set(names).size)
  })
})
