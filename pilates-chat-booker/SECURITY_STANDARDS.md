# Security Standards for Pilates Chat Booker

Mandatory security practices for all developers working on this project.

---

## 🔒 Core Principle

**Credentials are never hardcoded in source code. Period.**

```
✅ GOOD:   const apiKey = process.env.MINDBODY_API_KEY;
❌ BAD:    const apiKey = 'sk_live_abc123xyz';
```

---

## 📋 Credential Security Checklist

### For Every Developer

- [ ] I have read this document
- [ ] I understand `.env` is in `.gitignore`
- [ ] I will never commit `.env` with real credentials
- [ ] I will never hardcode any API key, username, or password
- [ ] I will use `.env.template` when setting up locally
- [ ] I will rotate credentials regularly
- [ ] I will report compromised credentials immediately

### Before Committing

```bash
# Check for hardcoded secrets
grep -r "MINDBODY_API_KEY" src/ config/ --exclude-dir=node_modules
grep -r "ARKETA_API_KEY" src/ config/ --exclude-dir=node_modules
grep -r "WL_PASSWORD" src/ config/ --exclude-dir=node_modules
grep -r "sk_live_\|sk_test_\|pk_live_" src/ config/ --exclude-dir=node_modules

# If any found, DO NOT COMMIT
```

---

## 🚫 Forbidden Practices

### ❌ Never Do These

```typescript
// ❌ Hardcoded API key
const API_KEY = 'sk_live_abc123xyz';

// ❌ API key in config file
export const config = {
  mindbodyApiKey: 'sk_live_abc123xyz',
};

// ❌ API key in source comment
// Using this API key: sk_live_abc123xyz

// ❌ Default value containing secret
const apiKey = process.env.MINDBODY_API_KEY || 'sk_live_abc123xyz';

// ❌ Credentials in test file
describe('Mindbody', () => {
  const API_KEY = 'sk_test_abc123xyz'; // Still a secret!
});

// ❌ Credentials logged anywhere
console.log('API Key:', process.env.MINDBODY_API_KEY); // Never!
logger.info(`Using key: ${apiKey}`); // Never!
```

### ✅ Always Do This

```typescript
// ✅ Load from environment
const apiKey = process.env.MINDBODY_API_KEY;
if (!apiKey) {
  throw new Error('MINDBODY_API_KEY not configured');
}

// ✅ Use environment variable with validation
import { validateRequiredEnvVar } from './config/environment';
const apiKey = validateRequiredEnvVar('MINDBODY_API_KEY');

// ✅ Never log secrets
logger.info('Initialized Mindbody adapter');
// Don't log the key itself!

// ✅ Redact in error messages
logger.error('Auth failed for Mindbody');
// Don't include the key in the error!
```

---

## 🔑 Credential Management

### Setup (First Time)

```bash
# 1. Copy template
cp .env.template .env

# 2. Edit .env with actual credentials
nano .env
# OR
vi .env
# OR use your IDE

# 3. Verify it's in .gitignore
cat .gitignore | grep "^\.env$"

# 4. Never commit this file
git status
# .env should NOT appear in the output
```

### Validation

The system validates credentials at startup:

```typescript
// src/config/environment.ts
function validateRequiredEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value;
}

// This runs at startup - missing credentials fail immediately
const mindbodyKey = validateRequiredEnvVar('MINDBODY_API_KEY');
```

**Behavior:**
- ✅ DEMO mode: Credentials optional (uses mock data)
- ✅ LIVE mode: Credentials required (fails at startup if missing)

### Rotation Schedule

| Platform | Frequency | Process |
|----------|-----------|---------|
| Mindbody | Annually | 1. Generate new key in Developer Portal<br/>2. Update .env locally<br/>3. Deploy to production<br/>4. Disable old key |
| Arketa | Annually | Same process |
| WellnessLiving | Every 6 months | Change password in dashboard, update .env, deploy |
| Momence | Annually | Same process |

---

## 🛡️ File Protection

### .gitignore (Already Configured)

```
.env
.env.local
.env.*.local
.env.production.local
```

**Never remove `.env` from `.gitignore`**

Verify the protection:

```bash
# Check .env is ignored
git check-ignore .env
# Output: .env

# Check .env.template is NOT ignored (safe to commit)
git check-ignore .env.template
# Output: (no output - file is NOT ignored, which is good)
```

### File Permissions

Restrict `.env` to owner only:

```bash
# Set permissions
chmod 600 .env

# Verify
ls -la .env
# Should show: -rw------- (owner read/write only)
```

---

## 🔍 Pre-Commit Checks

### Git Hook (Optional but Recommended)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing credentials

echo "🔒 Checking for hardcoded secrets..."

# Check for common secret patterns
if grep -r "sk_live_\|sk_test_\|pk_live_\|pk_test_" src/ config/ --exclude-dir=node_modules 2>/dev/null; then
  echo "❌ ERROR: Found hardcoded API key pattern"
  exit 1
fi

if grep -r "MINDBODY_API_KEY.*=" src/ --exclude-dir=node_modules --exclude=*.example --exclude=*.template 2>/dev/null; then
  echo "❌ ERROR: Found hardcoded MINDBODY_API_KEY"
  exit 1
fi

if grep -r "ARKETA_API_KEY.*=" src/ --exclude-dir=node_modules --exclude=*.example --exclude=*.template 2>/dev/null; then
  echo "❌ ERROR: Found hardcoded ARKETA_API_KEY"
  exit 1
fi

if grep -r "WL_PASSWORD.*=" src/ --exclude-dir=node_modules --exclude=*.example --exclude=*.template 2>/dev/null; then
  echo "❌ ERROR: Found hardcoded WL_PASSWORD"
  exit 1
fi

echo "✅ No hardcoded secrets found"
exit 0
```

Enable the hook:

```bash
chmod +x .git/hooks/pre-commit
```

---

## 📝 Development Standards

### Code Review Checklist

When reviewing code, ensure:

- [ ] No hardcoded API keys or passwords
- [ ] No credentials in comments
- [ ] No credentials in default values
- [ ] No credentials in error messages
- [ ] No credentials in logs
- [ ] Uses environment variables for all secrets
- [ ] Validates required credentials at startup
- [ ] Sensitive data redacted in logs

### Test File Standards

```typescript
// ✅ GOOD: Use mock values or environment
describe('MindbodyAdapter', () => {
  const mockApiKey = 'test_key_abc123'; // Test-only value
  // OR
  const apiKey = process.env.MINDBODY_API_KEY || 'test_default';
});

// ❌ BAD: Hardcoded real credentials
describe('MindbodyAdapter', () => {
  const apiKey = 'sk_live_real_key_from_prod'; // NEVER!
});
```

### Configuration File Standards

```typescript
// ✅ GOOD: src/config/environment.ts
export const config = {
  mindbody: {
    apiKey: validateRequiredEnvVar('MINDBODY_API_KEY'),
  },
};

// ❌ BAD: src/config/secrets.ts
export const secrets = {
  mindbodyApiKey: 'sk_live_abc123',
};
```

---

## 🚨 Incident Response

### If Credentials Are Compromised

1. **Immediate:**
   - [ ] Stop all deployments
   - [ ] Notify the team in Slack/email
   - [ ] Document which credential(s) were exposed
   - [ ] Note the timeline of exposure

2. **Within 1 hour:**
   - [ ] Regenerate the compromised credential in the platform dashboard
   - [ ] Update `.env` in all environments
   - [ ] Redeploy all services
   - [ ] Verify old credential is disabled

3. **Documentation:**
   - [ ] Create a post-mortem document
   - [ ] Document how the credential was exposed
   - [ ] Add preventive measures (e.g., hook, code review practice)
   - [ ] Share lessons learned with team

### Who to Contact

- **For secrets compromised:** [Your Team Lead]
- **For security concerns:** [Your Security Team]
- **For emergencies:** [On-call rotation]

---

## 🏭 Production Deployment

### Before Deploying

Credentials should **never** be in your git repository:

```bash
# Check no .env file is being deployed
git ls-files | grep "\.env"
# Should output nothing (or only .env.example and .env.template)

# Check no hardcoded secrets in code
npm run security:check
# (or equivalent linting step)
```

### Production Environments

Use your hosting platform's secret management:

**Heroku:**
```bash
heroku config:set MINDBODY_API_KEY=sk_live_abc123xyz
```

**Docker/Kubernetes:**
```bash
# Via secrets mount
kubectl create secret generic booking-secrets \
  --from-literal=MINDBODY_API_KEY=sk_live_abc123xyz
```

**AWS Lambda:**
```bash
aws secretsmanager create-secret \
  --name booking/mindbody-key \
  --secret-string sk_live_abc123xyz
```

**Separate credentials per environment:**
```
Development:  sk_test_dev_abc123
Staging:      sk_test_staging_abc123
Production:   sk_live_prod_abc123
```

---

## ✅ Security Audit

### Self-Audit Checklist

Run this monthly:

```bash
#!/bin/bash
echo "🔒 Security Audit"
echo "================"
echo ""

# 1. Check .env is ignored
echo "1. Checking .gitignore..."
if grep -q "^\.env$" .gitignore; then
  echo "   ✅ .env is ignored"
else
  echo "   ❌ .env is NOT ignored - FIX IMMEDIATELY"
  exit 1
fi

# 2. Check no secrets in git history
echo "2. Checking git history for secrets..."
if git log -p | grep -q "sk_live_\|sk_test_"; then
  echo "   ⚠️  Found secret patterns in git history"
  echo "   Consider: git filter-branch or github.com/awslabs/git-secrets"
else
  echo "   ✅ No obvious secrets in history"
fi

# 3. Check no hardcoded secrets in source
echo "3. Checking source code..."
if grep -r "sk_live_\|sk_test_\|MINDBODY_API_KEY.*=" src/ --exclude-dir=node_modules 2>/dev/null; then
  echo "   ❌ Found hardcoded secrets - FIX IMMEDIATELY"
  exit 1
else
  echo "   ✅ No hardcoded secrets in source"
fi

# 4. Check .env.example doesn't have real credentials
echo "4. Checking .env.example..."
if grep -q "sk_live_\|sk_test_" .env.example 2>/dev/null; then
  echo "   ❌ Real credentials in .env.example - FIX IMMEDIATELY"
  exit 1
else
  echo "   ✅ .env.example has no real credentials"
fi

echo ""
echo "✅ Security audit passed"
```

---

## 📚 References

- **Setup Guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Environment Config:** `src/config/environment.ts`
- **Gitignore:** `.gitignore`
- **Template:** `.env.template`
- **Example:** `.env.example`
- **OWASP:** [OWASP Secrets Management](https://owasp.org/www-community/Sensitive_Data_Exposure)

---

## 🎯 Summary

| What | Where | When |
|------|-------|------|
| **Template** | `.env.template` | Setup / CI/CD documentation |
| **Example** | `.env.example` | Git repo (no secrets) |
| **Live Secrets** | `.env` (not committed) | Local development only |
| **Production Secrets** | Platform secrets manager | Production only |
| **Validation** | `src/config/environment.ts` | Startup (fails if missing) |
| **Review** | Code review checklist | Every PR |
| **Audit** | Security audit script | Monthly |

---

**Status:** Mandatory for all contributors  
**Last Updated:** June 24, 2026  
**Review Frequency:** Quarterly
