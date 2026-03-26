# 💾 Real Backup Strategy - Disaster Recovery

## 🚨 Problema Actual: Backup Falso

**Configuración actual:**
```yaml
postgres_backup → MinIO (mismo host)
redis_backup → MinIO (mismo host)
```

**❌ Esto NO es backup real:**
- Si el servidor muere → pierdes TODO
- Mismo punto de falla (single host)
- Sin recuperación real de desastres

---

## 🎯 Estrategia Real de Backup

### Niveles de Backup

#### Nivel 1: Local (Actual)
- ✅ Rápido para recuperación inmediata
- ❌ No protege contra desastres del servidor

#### Nivel 2: Externo (Recomendado)
- ✅ Protección contra fallos de servidor
- ✅ Recuperación real de desastres
- ⚠️ Latencia en recuperación

#### Nivel 3: Multi-Cloud (Enterprise)
- ✅ Máxima resiliencia
- ✅ Protección contra desastres regionales
- ❌ Mayor complejidad y costo

---

## 🛠️ Implementación Real

### Opción A: MinIO Externo (Recomendado)

**Ventajas:**
- ✅ Compatible S3
- ✅ Control total
- ✅ Costo predecible
- ✅ Sintaxis familiar

**Setup:**
```bash
# 1. Servidor MinIO externo (diferente host)
docker run -d \
  --name external-minio \
  -p 9000:9000 -p 9001:9001 \
  -v /external/minio/data:/data \
  -e MINIO_ROOT_USER=backupadmin \
  -e MINIO_ROOT_PASSWORD=securepassword123 \
  minio/minio:latest server /data --console-address ":9001"

# 2. Configurar backup para usar MinIO externo
# Editar .env:
MINIO_EXTERNAL_ENDPOINT=https://backup-server.com:9000
MINIO_EXTERNAL_ACCESS_KEY=backupadmin
MINIO_EXTERNAL_SECRET_KEY=securepassword123
MINIO_EXTERNAL_BUCKET=workplace-backups
```

**Scripts de Backup Actualizados:**
```bash
#!/bin/bash
# backup-postgres-external.sh

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="workplace_postgres_${TIMESTAMP}.sql"
LOCAL_BACKUP="/backups/${BACKUP_FILE}"
EXTERNAL_ENDPOINT="${MINIO_EXTERNAL_ENDPOINT}"
ACCESS_KEY="${MINIO_EXTERNAL_ACCESS_KEY}"
SECRET_KEY="${MINIO_EXTERNAL_SECRET_KEY}"
BUCKET="${MINIO_EXTERNAL_BUCKET}"

# 1. Backup local
pg_dump -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} > "${LOCAL_BACKUP}"

# 2. Comprimir
gzip "${LOCAL_BACKUP}"

# 3. Subir a MinIO externo
mc alias set external-minio "${EXTERNAL_ENDPOINT}" "${ACCESS_KEY}" "${SECRET_KEY}"
mc cp "${LOCAL_BACKUP}.gz" "external-minio/${BUCKET}/postgres/"

# 4. Limpiar backups locales antiguos
find /backups -name "*.sql.gz" -mtime +7 -delete

# 5. Verificar
mc ls "external-minio/${BUCKET}/postgres/"
```

### Opción B: S3 Real (AWS)

**Ventajas:**
- ✅ Infraestructura probada
- ✅ Alta disponibilidad
- ✅ Lifecycle policies automáticas
- ✅ Cross-region replication

**Setup:**
```bash
# 1. Configurar AWS CLI
aws configure
# AWS_ACCESS_KEY_ID: tu-access-key
# AWS_SECRET_ACCESS_KEY: tu-secret-key
# Default region: us-east-1

# 2. Crear bucket S3
aws s3 mb s3://workplace-backups-prod

# 3. Configurar lifecycle
aws s3api put-bucket-lifecycle-configuration \
  --bucket workplace-backups-prod \
  --lifecycle-configuration file://lifecycle.json

# lifecycle.json
{
  "Rules": [
    {
      "ID": "BackupRule",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

**Script Backup S3:**
```bash
#!/bin/bash
# backup-postgres-s3.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="workplace_postgres_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://workplace-backups-prod/postgres/"

# 1. Backup y compresión
pg_dump -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} | gzip > "/tmp/${BACKUP_FILE}"

# 2. Subir a S3
aws s3 cp "/tmp/${BACKUP_FILE}" "${S3_BUCKET}"

# 3. Verificar
aws s3 ls "${S3_BUCKET}" | grep "${BACKUP_FILE}"

# 4. Limpiar temporal
rm "/tmp/${BACKUP_FILE}"
```

### Opción C: Multi-Cloud (Enterprise)

**Proveedores:**
- **AWS S3**: Principal
- **Google Cloud Storage**: Backup secundario
- **Azure Blob Storage**: Terciario
- **Wasabi**: Alternativa costo-efectiva

**Setup:**
```bash
#!/bin/bash
# backup-multi-cloud.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="workplace_postgres_${TIMESTAMP}.sql.gz"

# 1. Generar backup
pg_dump -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} | gzip > "/tmp/${BACKUP_FILE}"

# 2. Subir a múltiples proveedores
echo "Subiendo a AWS S3..."
aws s3 cp "/tmp/${BACKUP_FILE}" "s3://workplace-backups-prod/postgres/"

echo "Subiendo a Google Cloud..."
gsutil cp "/tmp/${BACKUP_FILE}" "gs://workplace-backups-gcs/postgres/"

echo "Subiendo a Azure..."
az storage blob upload \
  --file "/tmp/${BACKUP_FILE}" \
  --container-name workplace-backups \
  --name "postgres/${BACKUP_FILE}"

# 3. Verificar todos
echo "Verificando backups..."
aws s3 ls "s3://workplace-backups-prod/postgres/" | grep "${BACKUP_FILE}"
gsutil ls "gs://workplace-backups-gcs/postgres/" | grep "${BACKUP_FILE}"
az storage blob list \
  --container-name workplace-backups \
  --query "[?name=='postgres/${BACKUP_FILE}']"

# 4. Limpiar
rm "/tmp/${BACKUP_FILE}"
```

---

## 🔄 Estrategia de Recuperación

### Recuperación Rápida (Local)
```bash
# Si el servidor está vivo pero necesitas restaurar
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < /backups/latest_backup.sql
```

### Recuperación de Desastre (Externo)
```bash
# 1. Descargar backup externo
mc cp external-minio/workplace-backups/postgres/latest_backup.gz /tmp/

# 2. Restaurar
gunzip -c /tmp/latest_backup.gz | docker compose exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Recuperación Completa (Nuevo Servidor)
```bash
# 1. Setup nuevo servidor
git clone workplace-repo
cd workplace
cp .env.example .env
# Configurar variables

# 2. Descargar todos los backups
mc mirror external-minio/workplace-backups/ ./backups/

# 3. Iniciar servicios
docker compose up -d postgres redis

# 4. Restaurar datos
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < ./backups/postgres/latest.sql
docker compose exec redis redis-cli --rdb ./backups/redis/latest.rdb

# 5. Iniciar resto de servicios
docker compose up -d
```

---

## 📊 Monitoreo de Backups

### Health Checks
```bash
#!/bin/bash
# backup-health-check.sh

# Verificar backups recientes
echo "=== Verificando backups PostgreSQL ==="
find /backups -name "*.sql.gz" -mtime -1 | wc -l

echo "=== Verifying external backups ==="
mc ls external-minio/workplace-backups/postgres/ | tail -5

echo "=== Verificando tamaño de backups ==="
du -sh /backups/*
mc du external-minio/workplace-backups/
```

### Alertas
```bash
#!/bin/bash
# backup-alerts.sh

# Verificar si hay backups recientes (últimas 24 horas)
RECENT_BACKUPS=$(find /backups -name "*.sql.gz" -mtime -1 | wc -l)

if [ "${RECENT_BACKUPS}" -lt 1 ]; then
    echo "🚨 ALERTA: No hay backups recientes de PostgreSQL"
    # Enviar notificación (Slack, Email, etc.)
fi

# Verificar espacio en disco
DISK_USAGE=$(df /backups | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "${DISK_USAGE}" -gt 80 ]; then
    echo "🚨 ALERTA: Espacio en disco de backups al ${DISK_USAGE}%"
fi
```

---

## 🛡️ Seguridad de Backups

### Encriptación
```bash
# Encriptar backups antes de subir
gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 \
    --passphrase-file /backup/passphrase.txt \
    --output /backup/encrypted_backup.sql.gpg \
    /backup/backup.sql
```

### Access Control
```bash
# Permisos restrictivos
chmod 600 /backup/passphrase.txt
chmod 700 /backup/
chown -R backup:backup /backup/

# IAM policies para S3
aws iam put-user-policy \
  --user backup-user \
  --policy-name backup-only-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::workplace-backups-prod",
          "arn:aws:s3:::workplace-backups-prod/*"
        ]
      }
    ]
  }'
```

---

## 📈 Costos y Optimización

### Estimación de Costos (S3)
- **PostgreSQL**: ~2GB/día × 30 días = 60GB
- **Redis**: ~500MB/día × 30 días = 15GB
- **Total**: ~75GB/mes

**Costos S3 (us-east-1):**
- **S3 Standard**: $75 × $0.023 = ~$1.73/mes
- **S3 IA (después 30 días)**: $75 × $0.0125 = ~$0.94/mes
- **Glacier (después 90 días)**: $75 × $0.004 = ~$0.30/mes
- **Total estimado**: ~$3/mes

### Optimización
```bash
# Compresión adicional
pg_dump | gzip -9 | gzip > backup.sql.gz

# Deduplicación (restic/borg)
restic backup /backups/ --repo s3:s3.amazonaws.com/workplace-backups-restic

# Lifecycle automático
aws s3api put-bucket-lifecycle-configuration \
  --bucket workplace-backups-prod \
  --lifecycle-configuration file://lifecycle-optimizado.json
```

---

## 🚀 Implementación Recomendada

### Fase 1: Inmediata (Esta semana)
```bash
# 1. Configurar MinIO externo en servidor diferente
# 2. Actualizar scripts de backup
# 3. Test de recuperación
./scripts/test-backup-recovery.sh
```

### Fase 2: Corto Plazo (1 mes)
```bash
# 1. Migrar a S3 real
# 2. Configurar lifecycle policies
# 3. Implementar monitoreo y alertas
```

### Fase 3: Mediano Plazo (3 meses)
```bash
# 1. Multi-cloud backup
# 2. Encriptación de backups
# 3. Automatización completa con CI/CD
```

---

## 📋 Checklist de Backup Real

- [ ] Backup externo configurado
- [ ] Scripts de backup actualizados
- [ ] Test de recuperación realizado
- [ ] Monitoreo implementado
- [ ] Alertas configuradas
- [ ] Encriptación activada
- [ ] Access control configurado
- [ ] Documentación actualizada
- [ ] Costos optimizados
- [ ] Recovery time objective (RTO) definido
- [ ] Recovery point objective (RPO) definido

---

**🏁 Veredicto:** Implementar backup real externo es CRÍTICO para producción. El backup local actual solo sirve para desarrollo rápido.
