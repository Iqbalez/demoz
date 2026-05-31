'use client';

export default function AuditLogsPage() {
  // Mock data for display purposes
  const auditLogs = [
    { id: '1', action: 'USER_INVITED', entity: 'User', entityId: 'uuid-123', userId: 'admin-1', timestamp: new Date().toISOString(), ipAddress: '192.168.1.1' },
    { id: '2', action: 'PAYROLL_APPROVED', entity: 'PayrollRun', entityId: 'pr-456', userId: 'admin-1', timestamp: new Date(Date.now() - 86400000).toISOString(), ipAddress: '192.168.1.1' },
    { id: '3', action: 'SETTINGS_UPDATED', entity: 'Tenant', entityId: 'tenant-1', userId: 'admin-1', timestamp: new Date(Date.now() - 172800000).toISOString(), ipAddress: '192.168.1.5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--m-cream)]">Audit Logs</h1>
        <p className="text-sm text-[var(--m-muted)] mt-1">Immutable record of critical administrative actions.</p>
      </div>

      <div className="mt-8 rounded-lg border border-[var(--m-border)] bg-[var(--m-bg)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--m-border)]">
          <thead className="bg-[var(--m-card)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--m-border)]">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--m-card)]/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--m-cream)]">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-[var(--m-primary)]">{log.action}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--m-muted)]">
                  {log.entity} <span className="text-xs">({log.entityId})</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--m-muted)]">
                  {log.userId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--m-muted)] font-mono text-xs">
                  {log.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
