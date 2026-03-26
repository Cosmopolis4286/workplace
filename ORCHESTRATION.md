# 🎯 Guía de Migración a Orquestadores

## 📋 Por Qué Migrar?

**Docker Compose actual:**
- ✅ Perfecto para desarrollo y staging
- ✅ Configuración enterprise-ready
- ❌ Scaling manual (`--scale`)
- ❌ Sin auto-healing automático
- ❌ Sin rolling updates nativos

**Orquestadores resuelven:**
- 🔄 Auto-scaling basado en métricas
- 🛡️ Self-healing automático
- 🚀 Rolling updates sin downtime
- 📊 Gestión centralizada

---

## 🐳 Opción 1: Docker Swarm (Recomendado para empezar)

### Ventajas
- **Mínimo cambio**: Mismo docker-compose.yml
- **Curva baja**: 15-30 minutos de aprendizaje
- **Compatible**: Misma sintaxis y comandos

### Migración Paso a Paso

#### 1. Preparar el Entorno
```bash
# Backup actual
docker compose down
cp docker-compose.yml docker-compose.yml.backup

# Limpiar recursos previos
docker system prune -f
```

#### 2. Inicializar Swarm
```bash
# En el manager node
docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')

# Para nodes adicionales (workers)
docker swarm join --token <TOKEN> <MANAGER_IP>:2377

# Verificar cluster
docker node ls
```

#### 3. Desplegar Stack
```bash
# Deploy con configuración actual
docker stack deploy -c docker-compose.yml workplace

# Ver servicios
docker service ls
docker service ps workplace_backend
docker service ps workplace_frontend
```

#### 4. Configurar Escalado
```bash
# Escalar servicios
docker service scale workplace_backend=3
docker service scale workplace_frontend=2

# Verificar distribución
docker service ps workplace_backend
```

#### 5. Actualizaciones Rolling
```bash
# Actualizar imagen
docker service update \
  --image workplace/backend:latest \
  --update-parallelism 1 \
  --update-delay 10s \
  workplace_backend

# Rollback si algo falla
docker service rollback workplace_backend
```

### Archivo docker-compose.yml para Swarm
```yaml
version: '3.8'

services:
  backend:
    image: workplace/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        max_replicas_per_node: 2
    networks:
      - app_network

  frontend:
    image: workplace/frontend:latest
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    networks:
      - app_network

networks:
  app_network:
    driver: overlay
    attachable: true
```

---

## ☸️ Opción 2: Kubernetes (Producción Enterprise)

### Ventajas
- **Ecosistema maduro**: Helm, Istio, etc.
- **Auto-scaling avanzado**: HPA, VPA
- **Multi-cluster**: Federación
- **Community**: Más grande y activa

### Migración Paso a Paso

#### 1. Instalar Kubernetes
```bash
# Opción A: Minikube (local)
minikube start --cpus=4 --memory=8192

# Opción B: k3s (ligero)
curl -sfL https://get.k3s.io | sh -

# Opción C: EKS/GKE/Azure (producción)
# Usar terraform o cloud console
```

#### 2. Convertir docker-compose a Kubernetes
```bash
# Instalar kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.28.0/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convertir
kompose convert -f docker-compose.yml --out k8s/
```

#### 3. Aplicar Manifiestos
```bash
# Crear namespace
kubectl create namespace workplace

# Aplicar configuración
kubectl apply -f k8s/ -n workplace

# Ver estado
kubectl get pods -n workplace
kubectl get services -n workplace
```

#### 4. Configurar Auto-scaling
```bash
# Horizontal Pod Autoscaler
kubectl autoscale deployment backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n workplace

kubectl autoscale deployment frontend \
  --cpu-percent=70 \
  --min=2 \
  --max=8 \
  -n workplace

# Ver HPA
kubectl get hpa -n workplace
```

### Manifiestos Kubernetes Clave

#### backend-deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: workplace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: workplace/backend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: 250m
            memory: 384Mi
          limits:
            cpu: 750m
            memory: 768Mi
        livenessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: workplace
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

#### hpa.yaml
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: workplace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 📊 Comparación: Swarm vs Kubernetes

| Característica | Docker Swarm | Kubernetes |
|---------------|--------------|------------|
| **Curva aprendizaje** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Complejidad** | Baja | Alta |
| **Ecosistema** | Limitado | Extenso |
| **Auto-scaling** | Básico | Avanzado |
| **Multi-cluster** | No | Sí |
| **Community** | Pequeña | Grande |
| **Producción** | Viable | Enterprise |

---

## 🚀 Recomendación de Migración

### Fase 1: Swarm (1-2 semanas)
1. Migrar stack actual a Swarm
2. Configurar escalado manual
3. Implementar rolling updates
4. Probar en staging

### Fase 2: Kubernetes (2-4 semanas)
1. Evaluar necesidades reales
2. Migrar a K8s si es necesario
3. Configurar auto-scaling avanzado
4. Implementar GitOps (ArgoCD)

### Fase 3: Enterprise (continuo)
1. Añadir service mesh (Istio)
2. Implementar CI/CD avanzado
3. Configurar multi-cluster
4. Añadir observabilidad avanzada

---

## 🛡️ Consideraciones de Seguridad

### Secrets Management
```bash
# Swarm
docker secret create db_password ./db_password.txt

# Kubernetes
kubectl create secret generic db-password \
  --from-file=./db_password.txt \
  -n workplace
```

### Network Policies
```yaml
# Kubernetes Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workplace-netpol
  namespace: workplace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
```

---

## 📚 Recursos Adicionales

### Documentación
- [Docker Swarm Docs](https://docs.docker.com/engine/swarm/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Kompose Converter](https://kompose.io/)

### Herramientas Útiles
- **Portainer**: UI para Swarm/K8s
- **Lens**: IDE para Kubernetes
- **Rancher**: Multi-cluster management

---

**🎯 Veredicto**: Comenzar con Swarm, migrar a Kubernetes solo si el crecimiento lo justifica.
