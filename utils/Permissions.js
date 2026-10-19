// Master list of all permission keys available in the system.
// Add a new permission here and it will automatically show up
// as a checkbox on the Settings > Staff page (frontend fetches this list).

export const PERMISSIONS = [
    { key: 'manage_jobs', label: 'Manage Jobs' },
    { key: 'manage_users', label: 'Manage Users' },
    { key: 'manage_payouts', label: 'Manage Payouts' },
    { key: 'manage_disputes', label: 'Manage Disputes' },
    { key: 'manage_staff', label: 'Manage Staff' },
    { key: 'view_reports', label: 'View Reports' },
    { key: 'manage_tax_info', label: 'Manage Tax Info' },
]

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key)