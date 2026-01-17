# 🗄️ Runbook: Database Down

> How to handle database connection issues

---

## 🚨 Symptoms

- "Database connection failed" errors
- 500 errors on API calls
- Application won't start
- Timeout errors

---

## 🔍 Diagnosis

### Step 1: Check Database Status

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection
psql $DATABASE_URL -c "SELECT 1"
```

### Step 2: Check Logs

```bash
# PostgreSQL logs
tail -100 /var/log/postgresql/postgresql-16-main.log
```

### Step 3: Check Connection Pool

```bash
# Active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Max connections
psql $DATABASE_URL -c "SHOW max_connections"
```

---

## 🛠️ Resolution

### If: PostgreSQL Not Running

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Check status
sudo systemctl status postgresql
```

### If: Connection Pool Exhausted

```bash
# Kill idle connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes'
"
```

### If: Disk Full

```bash
# Check disk space
df -h

# Clear old logs
sudo rm /var/log/postgresql/*.log.gz

# Clear old backups
rm /backups/backup_*.dump.old
```

### If: Too Many Connections

1. Check for connection leaks in code
2. Restart application:
   ```bash
   pm2 restart traviapp
   ```

### If: Corrupted Database

1. Stop application
2. Restore from backup:
   ```bash
   pg_restore -h localhost -U user -d traviapp backup.dump
   ```

---

## ✅ Verification

1. Database connection works:
   ```bash
   psql $DATABASE_URL -c "SELECT NOW()"
   ```

2. Application starts without errors

3. API endpoints respond

4. No connection errors in logs

---

## 🔄 Prevention

- Monitor connection pool usage
- Set up disk space alerts
- Regular backup verification
- Connection pooling (PgBouncer)
- Health check includes DB

---

## 📞 Escalation

If unresolved after 15 minutes:

1. Contact: @dba
2. Contact: Replit support (if hosted)
3. Prepare: Latest backup for restore
