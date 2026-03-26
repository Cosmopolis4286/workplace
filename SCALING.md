# 🚀 Guía de Escalado - Workplace Infrastructure

## 📋 Escenario Actual

**Stack listo para producción enterprise con:**
- Rate limiting completo
- Load balancing real
- Autoscaling configurado
- Healthchecks robustos

## 🔧 Comandos de Escalado (Docker Compose)

### Escalado Básico
```bash
# Escalar backend a 3 instancias
docker compose up --scale backend=3

# Escalar frontend a 2 instancias  
docker compose up --scale frontend=2

# Escalar ambos servicios simultáneamente
docker compose up --scale backend=3 --scale frontend=2
```

### Escalado con Recursos Adicionales
```bash
# Escalar con límites de recursos personalizados
docker compose up --scale backend=3 --scale frontend=2 \
  --scale postgres=1 \
  --scale redis=1
```

### Verificación del Escalado
```bash
# Ver instancias corriendo
docker compose ps

# Ver logs de servicios escalados
docker compose logs backend
docker compose logs frontend

# Ver métricas de load balancing
curl http://localhost/api/health
```

## 🔄 Migración a Orquestadores

### Opción 1: Docker Swarm (Mínimo Esfuerzo)

**Ventajas:**
- Compatible con docker-compose.yml
- Misma sintaxis
- Despliegue rápido

**Comandos:**
```bash
# Inicializar Swarm
docker swarm init

# Desplegar stack con replicas
docker stack deploy -c docker-compose.yml workplace

# Escalar servicios
docker service scale workplace_backend=3
docker service scale workplace_frontend=2

# Ver estado
docker service ls
docker service ps workplace_backend
```

### Opción 2: Kubernetes (Producción Enterprise)

**Ventajas:**
- Escalado automático (HPA)
- Rolling updates avanzados
- Self-healing
- Ecosistema maduro

**Archivos necesarios:**
```bash
# Convertir docker-compose a Kubernetes
kompose convert -f docker-compose.yml

# Aplicar manifiestos
kubectl apply -f deployments/
kubectl apply -f services/
```

**Escalado en Kubernetes:**
```bash
# Escalar manualmente
kubectl scale deployment backend --replicas=3
kubectl scale deployment frontend --replicas=2

# Escalado automático (HPA)
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10
kubectl autoscale deployment frontend --cpu-percent=70 --min=2 --max=8
```

## 📊 Métricas y Monitoreo

### Prometheus + Grafana
- **Backend metrics**: http://localhost:9090
- **Grafana dashboard**: http://localhost:3001
- **Loki logs**: http://localhost:3100

### Métricas Clave de Escalado
- CPU/Memory usage por instancia
- Request latency percentiles
- Error rate por servicio
- Connection pool status (pgBouncer)

## 🛡️ Consideraciones de Seguridad

### Rate Limiting
- **API endpoints**: 10 requests/segundo
- **Login endpoints**: 5 requests/minuto  
- **General traffic**: 20 requests/segundo

### Load Balancing
- **Algoritmo**: least_conn
- **Health checks**: cada 15 segundos
- **Failover**: automático con 3 reintentos

## 🚨 Troubleshooting

### Problemas Comunes
```bash
# Si nginx no balancea correctamente
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

# Si los healthchecks fallan
docker compose exec backend wget localhost:3000/api/ready

# Si el rate limiting bloquea tráfico legítimo
# Revisar logs de nginx
docker compose logs nginx | grep "limit_req"
```

### Verificación de Conexiones
```bash
# Probar balanceo de carga
for i in {1..10}; do
  curl -s http://localhost/api/health | head -1
  sleep 0.1
done

# Ver distribución de conexiones
docker compose exec nginx cat /var/log/nginx/access.log | tail -10
```

## 🎯 Próximos Pasos

1. **Producción**: Migrar a Swarm o Kubernetes
2. **Storage**: Externalizar MinIO/S3
3. **CDN**: Añadir Cloudflare delante
4. **WAF**: Implementar Web Application Firewall
5. **Auto-scaling**: Configurar basado en métricas reales

---

**Estado Actual**: ✅ Enterprise-ready para producción con scaling manual
