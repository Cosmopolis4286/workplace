import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyDevEnvFile, loadFrontendConfig, parseEnvFile, publicConfig } from '../../config/env'

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

function envFile(content: string) {
  const dir = mkdtempSync(join(tmpdir(), 'envdev-'))
  const file = join(dir, '.env.dev')
  writeFileSync(file, content)
  return file
}

describe('parseEnvFile', () => {
  it('lee KEY=VALUE, ignora comentarios y quita comillas', () => {
    expect(
      parseEnvFile('# comentario\nAPI_URL="http://localhost:3001/api"\r\nUSE_DEMO=true\nexport DOMAIN=localhost\nVACIA=\n')
    ).toEqual({ API_URL: 'http://localhost:3001/api', USE_DEMO: 'true', DOMAIN: 'localhost', VACIA: '' })
  })
})

describe('applyDevEnvFile (desarrollo)', () => {
  it('.env.dev reemplaza variables de Windows/la terminal (p. ej. API_URL de producción)', () => {
    process.env.NODE_ENV = 'development'
    process.env.API_URL = 'https://playrke.com/api'
    process.env.DOMAIN = 'playrke.com'
    const file = envFile('API_URL=http://localhost:3001/api\nDOMAIN=localhost\n')

    expect(applyDevEnvFile(file).sort()).toEqual(['API_URL', 'DOMAIN'])
    expect(process.env.API_URL).toBe('http://localhost:3001/api')
    expect(process.env.DOMAIN).toBe('localhost')
  })

  it('una variable vacía en .env.dev no borra la de otra fuente', () => {
    process.env.NODE_ENV = 'development'
    process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY = 'clave-de-frontend-env'
    applyDevEnvFile(envFile('NUXT_PUBLIC_RECAPTCHA_SITE_KEY=\n'))
    expect(process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY).toBe('clave-de-frontend-env')
  })

  it('en build/generate (producción) no toca nada', () => {
    process.env.NODE_ENV = 'production'
    process.env.API_URL = 'https://playrke.com/api'
    expect(applyDevEnvFile(envFile('API_URL=http://localhost:3001/api\n'))).toEqual([])
    expect(process.env.API_URL).toBe('https://playrke.com/api')
  })

  it('sin .env.dev (contenedor frontend-dev) no hace nada', () => {
    process.env.NODE_ENV = 'development'
    expect(applyDevEnvFile('/no/existe/.env.dev')).toEqual([])
  })
})

describe('publicConfig / loadFrontendConfig', () => {
  it('valores por defecto: API relativo y entorno de producción', () => {
    delete process.env.API_URL
    delete process.env.APP_ENV
    delete process.env.USE_DEMO
    expect(publicConfig()).toMatchObject({ apiUrl: '/api', environment: 'production', useDemoCredentials: false })
  })

  it('en desarrollo fija NUXT_PUBLIC_API_URL para que frontend/.env no lo pise en ejecución', () => {
    process.env.NODE_ENV = 'development'
    process.env.API_URL = 'http://localhost:3001/api'
    process.env.NUXT_PUBLIC_API_URL = 'https://playrke.com/api'
    expect(loadFrontendConfig().apiUrl).toBe('http://localhost:3001/api')
    expect(process.env.NUXT_PUBLIC_API_URL).toBe('http://localhost:3001/api')
  })
})
