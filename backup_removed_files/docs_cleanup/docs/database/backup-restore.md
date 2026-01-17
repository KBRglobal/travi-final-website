# 💾 Backup & Restore

> Database backup and recovery procedures

---

## 📋 Backup Strategy

### Backup Types

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full | Daily | 30 days |
| Incremental | Hourly | 7 days |
| Before deploy | Each deploy | 7 days |

---

## 🔧 Backup Commands

### Full Backup

```bash
# Basic backup
pg_dump -h localhost -U user -d traviapp > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U user -d traviapp | gzip > backup_$(date +%Y%m%d).sql.gz

# Custom format (recommended)
pg_dump -h localhost -U user -d traviapp -Fc > backup_$(date +%Y%m%d).dump
```

### Schema Only

```bash
pg_dump -h localhost -U user -d traviapp --schema-only > schema.sql
```

### Data Only

```bash
pg_dump -h localhost -U user -d traviapp --data-only > data.sql
```

### Specific Tables

```bash
pg_dump -h localhost -U user -d traviapp \
  -t contents -t translations -t users \
  > partial_backup.sql
```

---

## 🔄 Restore Commands

### From SQL File

```bash
psql -h localhost -U user -d traviapp < backup.sql
```

### From Compressed

```bash
gunzip -c backup.sql.gz | psql -h localhost -U user -d traviapp
```

### From Custom Format

```bash
pg_restore -h localhost -U user -d traviapp backup.dump
```

### To New Database

```bash
createdb traviapp_restored
pg_restore -h localhost -U user -d traviapp_restored backup.dump
```

---

## 📅 Automated Backups

### Cron Job

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Backup Script

```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
DB_NAME=traviapp
DB_USER=user
DB_HOST=localhost

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -Fc \
  > $BACKUP_DIR/backup_$DATE.dump

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.dump s3://bucket/backups/
```

---

## ☁️ Cloud Backup

### To S3

```bash
# Backup and upload
pg_dump -h localhost -U user -d traviapp -Fc | \
  aws s3 cp - s3://bucket/backups/backup_$(date +%Y%m%d).dump
```

### From S3

```bash
# Download and restore
aws s3 cp s3://bucket/backups/backup_20241223.dump - | \
  pg_restore -h localhost -U user -d traviapp
```

---

## 🚨 Disaster Recovery

### Recovery Steps

1. **Assess Damage**
   - Identify what data is lost
   - Determine recovery point

2. **Stop Application**
   ```bash
   # Prevent further writes
   systemctl stop traviapp
   ```

3. **Restore Database**
   ```bash
   # Drop and recreate
   dropdb traviapp
   createdb traviapp
   pg_restore -h localhost -U user -d traviapp backup.dump
   ```

4. **Verify Data**
   ```bash
   psql -h localhost -U user -d traviapp -c "SELECT COUNT(*) FROM contents;"
   ```

5. **Restart Application**
   ```bash
   systemctl start traviapp
   ```

---

## 🧪 Backup Testing

### Monthly Test Procedure

1. Create test database
   ```bash
   createdb traviapp_test_restore
   ```

2. Restore latest backup
   ```bash
   pg_restore -h localhost -U user -d traviapp_test_restore backup.dump
   ```

3. Verify data integrity
   ```bash
   psql -d traviapp_test_restore -c "
     SELECT
       (SELECT COUNT(*) FROM contents) as contents,
       (SELECT COUNT(*) FROM users) as users,
       (SELECT COUNT(*) FROM translations) as translations;
   "
   ```

4. Compare with production
   ```bash
   # Should match (approximately for recent backups)
   ```

5. Cleanup
   ```bash
   dropdb traviapp_test_restore
   ```

---

## 📊 Backup Monitoring

### Check Backup Size

```bash
ls -lh /backups/
```

### Verify Backup Integrity

```bash
pg_restore --list backup.dump > /dev/null && echo "OK" || echo "CORRUPTED"
```

### Alert on Failure

```bash
# In backup script
if [ $? -ne 0 ]; then
  echo "Backup failed" | mail -s "ALERT: Backup Failed" admin@example.com
fi
```

---

## ⚠️ Important Notes

### Before Major Changes

Always backup before:
- Schema migrations
- Bulk data updates
- Version upgrades
- Production deploys

### Security

- Encrypt backups at rest
- Secure backup storage
- Limit access to backups
- Don't store credentials in scripts

### Replit Specifics

Replit manages PostgreSQL. For backups:

```bash
# Export via pg_dump
pg_dump $DATABASE_URL > backup.sql

# Or use Replit's backup features
```
