# 🔥 Runbook: High CPU Usage

> How to handle high CPU alerts

---

## 🚨 Symptoms

- CPU usage > 80% for 5+ minutes
- Slow response times
- Request timeouts
- Health check failures

---

## 🔍 Diagnosis

### Step 1: Check Current Usage

```bash
# View processes
top -o %CPU

# Or htop for better view
htop
```

### Step 2: Identify Culprit

```bash
# Find high CPU processes
ps aux --sort=-%cpu | head -10
```

### Step 3: Check Application

```bash
# Check Node.js process
ps aux | grep node

# Check memory usage too
free -m
```

### Step 4: Review Logs

```bash
# Recent errors
tail -100 /var/log/traviapp.log | grep -i error
```

---

## 🛠️ Resolution

### If: High Traffic Spike

1. Check traffic source
   ```bash
   # View connections
   netstat -an | grep :5000 | wc -l
   ```

2. Enable rate limiting (if disabled)

3. Scale up if legitimate traffic

### If: Runaway Process

1. Identify the process
   ```bash
   ps aux --sort=-%cpu | head -5
   ```

2. If safe, restart:
   ```bash
   pm2 restart traviapp
   ```

### If: AI Generation Overload

1. Check AI job queue
   ```bash
   GET /api/admin/jobs/stats
   ```

2. Pause new jobs if needed

3. Increase AI rate limits

### If: Database Queries

1. Check slow queries
   ```sql
   SELECT query, calls, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. Add missing indexes

3. Optimize queries

---

## ✅ Verification

After resolution:

1. CPU returns to normal (< 70%)
2. Response times normal (< 200ms)
3. No errors in logs
4. Health check passes

---

## 🔄 Prevention

- Set up CPU alerts at 70%
- Monitor AI job queue
- Optimize database queries
- Implement caching
- Review code for inefficiencies

---

## 📞 Escalation

If unresolved after 30 minutes:

1. Contact: @team-lead
2. Consider: Rolling back recent deploy
3. Document: Findings in incident report
