# Demoz Operations Playbook

## 1. Cloud Billing and Activity Monitoring
To prevent unexpected cloud resource exhaustion or unexpected geographic logins:
- **Billing Alerts:** Configure automated billing alerts on the primary hosting provider (e.g., Render, AWS) to trigger when projected monthly spend exceeds 80% of the allocated budget.
- **Activity Monitoring:** Set up Datadog or Sentry alerts for unusual spikes in API requests, rapid database read operations, or logins from regions outside of Ethiopia.

## 2. Automated Backups & Restoration Verification
- **Encrypted Backups:** Ensure that the managed PostgreSQL database is configured to take automated, daily encrypted backups.
- **Retention:** Retain database backups for a minimum of 30 days.
- **Restoration Testing:** Conduct a monthly "Disaster Recovery Drill" by restoring a backup to a secure staging environment. Verify that all tables, especially encrypted fields (TIN, Bank Accounts, GPS coordinates), are intact and recoverable.

## 3. Supply Chain Security (Dependencies)
- **Routine Audits:** The CI/CD pipeline must run `npm run security:audit` on every pull request to detect known vulnerabilities in third-party packages.
- **Vendor Risk Assessment:** Before integrating new third-party APIs or analytics tools, assess their data access scope. Ensure they cannot exfiltrate plaintext PII.
- **Updates:** Schedule bi-weekly dependency updates using tools like Dependabot or Renovate.

## 4. Compliance & Retention
- **Data Minimization:** Ensure the `DataRetentionService` cron job runs successfully every midnight to purge 30-day old attendance logs and GPS coordinates.
- **Legal Compliance:** Terminated employee records must be retained for exactly 7 years before deletion to comply with Ethiopian ERCA/SIGTAS tax and pension reporting requirements.
