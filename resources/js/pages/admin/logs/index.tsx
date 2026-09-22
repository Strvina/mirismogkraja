import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';

interface LogEntry {
    id: number;
    user_name: string;
    action: string;
    subject_type: string;
    subject_id: number;
    subject_label: string | null;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    created_at: string;
}

const actionLabels: Record<string, string> = {
    created: 'Kreirano',
    updated: 'Izmenjeno',
    archived: 'Arhivirano',
    restored: 'Vraćeno',
    deleted: 'Obrisano',
};

const actionClasses: Record<string, string> = {
    created: 'bg-olive-soft text-olive',
    updated: 'bg-gold/15 text-foreground',
    archived: 'bg-muted text-muted-foreground',
    restored: 'bg-olive-soft text-olive',
    deleted: 'bg-destructive/10 text-destructive',
};

const subjectLabels: Record<string, string> = {
    Producer: 'Proizvođač',
    Product: 'Proizvod',
    Category: 'Kategorija',
    Order: 'Upit',
    Review: 'Ocena',
};

const selectClasses =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none';

const show = (value: unknown) => (value === null || value === '' ? '—' : String(value));

export default function AdminLogsIndex({
    logs,
    subjects,
    filters,
}: {
    logs: Paginated<LogEntry>;
    subjects: string[];
    filters: { action?: string; subject?: string };
}) {
    const filter = (patch: Record<string, string | undefined>) => {
        router.get('/admin/logovi', { ...filters, ...patch, page: undefined }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AdminLayout title="Logovi">
            <Head title="Logovi — Admin" />

            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                Ko je šta uradio na sajtu. Zapis ostaje i kada se sam podatak obriše — to je i slučaj koji najviše vredi zabeležiti.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
                <select className={selectClasses} value={filters.action ?? ''} onChange={(e) => filter({ action: e.target.value || undefined })}>
                    <option value="">Sve akcije</option>
                    {Object.entries(actionLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>

                <select className={selectClasses} value={filters.subject ?? ''} onChange={(e) => filter({ subject: e.target.value || undefined })}>
                    <option value="">Sve vrste</option>
                    {subjects.map((subject) => (
                        <option key={subject} value={subject}>
                            {subjectLabels[subject] ?? subject}
                        </option>
                    ))}
                </select>
            </div>

            <div className="border-border/70 divide-border/70 mt-6 divide-y rounded-lg border">
                {logs.data.map((log) => (
                    <div key={log.id} className="p-4">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionClasses[log.action] ?? 'bg-muted'}`}>
                                {actionLabels[log.action] ?? log.action}
                            </span>
                            <span className="font-medium">{subjectLabels[log.subject_type] ?? log.subject_type}</span>
                            <span className="text-muted-foreground break-words">
                                {log.subject_label ? `„${log.subject_label}"` : `#${log.subject_id}`}
                            </span>
                            <span className="text-muted-foreground">· {log.user_name}</span>
                            <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString('sr-RS')}
                            </span>
                        </div>

                        {log.changes && Object.keys(log.changes).length > 0 && (
                            <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                                {Object.entries(log.changes).map(([field, change]) => (
                                    <li key={field} className="break-words">
                                        <span className="font-medium">{field}</span>: {show(change.from)} → {show(change.to)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}

                {logs.data.length === 0 && <p className="text-muted-foreground p-8 text-center text-sm">Nema zapisa za ove filtere.</p>}
            </div>

            <Pagination meta={logs} />
        </AdminLayout>
    );
}
