#!/bin/sh
# Entrypoint de Postgres SOLO para desarrollo (docker-compose.hybrid.yml y
# docker-compose.lite.dev.yml). Nunca usar en producción.
#
# Problema que resuelve: Postgres aplica POSTGRES_PASSWORD únicamente la
# primera vez que crea el volumen. Si después cambia la contraseña en
# .env.dev (o el volumen lo creó otro compose con otro .env), el backend
# falla con "P1000: Authentication failed".
#
# Solución: arranca Postgres como siempre (docker-entrypoint.sh) y, cuando
# ya acepta conexiones, vuelve a fijar la contraseña del usuario con la de
# .env.dev por el socket local (que no pide contraseña dentro del
# contenedor). Recién entonces crea /tmp/.password-synced, que el
# healthcheck exige: el backend no arranca antes de que la contraseña
# coincida.
set -u

MARKER=/tmp/.password-synced
rm -f "$MARKER"

docker-entrypoint.sh "$@" &
PG_PID=$!
# `docker stop` manda SIGTERM a este proceso: se lo pasamos a Postgres para
# que se apague limpio.
trap 'kill -TERM "$PG_PID" 2>/dev/null' TERM INT

sync_password() {
  # Se espera al servidor definitivo: el temporal que levanta el primer
  # init no escucha por TCP, así que pg_isready por 127.0.0.1 lo ignora.
  until pg_isready -q -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER"; do
    kill -0 "$PG_PID" 2>/dev/null || return 1
    sleep 1
  done

  # Variables de psql (:"role" y :'pw') para que comillas o símbolos en la
  # contraseña no rompan el SQL. Solo funcionan leyendo de stdin, no con -c.
  if psql -v ON_ERROR_STOP=1 -q -h /var/run/postgresql \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v role="$POSTGRES_USER" -v pw="$POSTGRES_PASSWORD" <<'SQL'
ALTER ROLE :"role" WITH PASSWORD :'pw';
SQL
  then
    echo "🔑 Contraseña de '$POSTGRES_USER' sincronizada con POSTGRES_PASSWORD (.env.dev)"
    touch "$MARKER"
  else
    echo "❌ No se pudo sincronizar la contraseña de '$POSTGRES_USER'."
    echo "   Si el error dice que el rol no existe, este volumen lo creó otro compose"
    echo "   con otro POSTGRES_USER. Revisa los usuarios con:"
    echo "     docker exec <contenedor-postgres> psql -U postgres -c '\\du'"
  fi
}

sync_password &

wait "$PG_PID"
STATUS=$?
# Si el wait lo cortó la señal, esperamos a que Postgres termine de apagarse.
trap - TERM INT
wait "$PG_PID" 2>/dev/null || true
exit "$STATUS"
