# SSL Setup Script v2.1 - Mejoras Aplicadas

## 🚀 Mejoras Implementadas

### 1. ✅ Verificación Estricta de ACME Challenge
- **Antes**: `curl -f` con warning silencioso si fallaba
- **Ahora**: `curl -f` con `exit 1` si el endpoint no es accesible
- **Beneficio**: Evita generar certificados inválidos por problemas de DNS/firewall

### 2. ⏱️ Sleeps después de restart de nginx
- **Agregado**: `sleep 5` después de cada `docker compose restart nginx`
- **Beneficio**: Asegura que nginx esté completamente levantado antes de continuar

### 3. 🔍 Verificación de estado de nginx
- **Agregado**: Verificación `docker compose ps nginx | grep -q "Up"` después de cada restart
- **Beneficio**: Detecta errores de configuración nginx inmediatamente

### 4. 🧪 Modo Staging/Testing
- **Nueva variable**: `STAGING_MODE=true/false`
- **Uso**: `STAGING_MODE=true ./setup-ssl-v2.sh`
- **Beneficio**: Evita rate limits de Let's Encrypt en pruebas

### 5. 📝 Template-based Configuration
- **Antes**: Múltiples comandos `sed` (riesgoso)
- **Ahora**: Template `default.conf.template` con placeholders `{{DOMAIN}}`
- **Beneficio**: Configuración atómica y segura

### 6. 💾 Backups Automáticos
- **Agregado**: Backup de configuración nginx antes de cambios
- **Formato**: `default.conf.backup.YYYYMMDD-HHMMSS`
- **Beneficio**: Rollback fácil si algo falla

## 📋 Uso del Script

### Producción
```bash
./setup-ssl-v2.sh
```

### Staging/Testing (sin rate limits)
```bash
STAGING_MODE=true ./setup-ssl-v2.sh
```

### Con dominio específico
```bash
DOMAIN=midominio.com ./setup-ssl-v2.sh
```

## 🔧 Requisitos Previos

1. **DNS**: El dominio debe apuntar a la IP del servidor
2. **Firewall**: Puerto 80 (HTTP) debe estar abierto
3. **Nginx**: Container nginx debe poder iniciar
4. **Certbot**: Se instala automáticamente si no existe

## 📁 Archivos Modificados

- `scripts/setup-ssl-v2.sh` - Script principal mejorado
- `nginx/conf.d/default.conf.template` - Template de configuración
- `nginx/conf.d/default.conf` - Configuración generada (no editar manualmente)

## 🚨 Manejo de Errores

### ACME Challenge no accesible
```
❌ ACME challenge no accesible, abortando generación de certificado
🔍 Verifica que:
   - El dominio midominio.com apunta a este servidor
   - Nginx está corriendo y sirviendo en el puerto 80
   - El firewall permite tráfico HTTP (puerto 80)
```

### Nginx no se inicia
```
❌ Error: nginx no se inició después del restart
```
- Revisa logs: `docker compose logs nginx --tail=20`
- Verifica configuración: `docker compose config nginx`

## 🔄 Flujo del Script

1. **Verificar certificados existentes**
   - Si existen y son válidos → configurar nginx y salir
   - Si existen pero expiraron → intentar renovar
   - Si no existen → generar nuevos

2. **Generar nuevos certificados**
   - Iniciar nginx para ACME challenges
   - Verificar endpoint ACME
   - Solicitar certificados (con o sin staging)
   - Configurar nginx con template

3. **Verificación final**
   - Reiniciar nginx
   - Verificar que esté levantado
   - Confirmar configuración SSL

## 🎯 Mejoras Futuras Sugeridas

1. **Auto-renewal**: Configurar cron job para renovación automática
2. **Health check**: Verificar HTTPS después de configuración
3. **Multi-domain**: Soporte para múltiples dominios
4. **Email notifications**: Alertas de expiración y renovación
