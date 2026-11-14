// Corre antes de `nuxt dev` (ver "dev" en package.json).
//
// Si el puerto 3000 ya está ocupado, Nuxt arranca en OTRO puerto sin
// detenerse, y en http://localhost:3000 sigue respondiendo lo que lo ocupaba:
// típicamente el contenedor frontend-dev de docker-compose.lite.dev.yml, con
// otra configuración (p. ej. apuntando al API de producción). Es muy difícil
// de notar, así que aquí se corta con un mensaje claro.
import net from 'node:net'

const port = Number(process.env.NITRO_PORT || process.env.PORT || 3000)

const server = net.createServer()
server.once('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err
  console.error(`
❌ El puerto ${port} ya está ocupado: http://localhost:${port} NO sería este "pnpm dev".

   Busca qué lo usa:
     docker ps --format "{{.Names}}  {{.Ports}}"     (¿frontend-dev u otro contenedor?)
     netstat -ano | findstr ":${port} "              (Windows: PID en la última columna)

   Y libéralo:
     docker stop frontend-dev                        (si es el contenedor)
     taskkill /PID <pid> /F                          (si es otro proceso)
`)
  process.exit(1)
})
server.once('listening', () => server.close(() => process.exit(0)))
server.listen(port, '0.0.0.0')
