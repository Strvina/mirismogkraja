import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Check, X } from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected';

interface ChangeRequest {
    id: number;
    field: string;
    current_value: string | null;
    requested_value: string;
    status: Status;
    created_at: string;
    producer: { id: number; name: string; slug: string };
    requester: { id: number; name: string };
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending', label: 'Čekaju odluku' },
    { status: 'approved', label: 'Odobreni' },
    { status: 'rejected', label: 'Odbijeni' },
];

/** Plain words for the stored column names. */
const FIELD_LABELS: Record<string, string> = {
    name: 'Naziv proizvođača',
};

/**
 * Changes a producer asked for but may not make alone (task 15). Everything
 * else about their page - opis, priča, kontakt, dostava, slike, proizvodi -
 * they change themselves and it applies at once; this queue exists for the
 * few fields that were approved once and buyers now recognise.
 */
export default function AdminChangeRequests({
    requests,
    filters,
    counts,
}: {
    requests: ChangeRequest[];
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const approve = (request: ChangeRequest) => router.patch(route('admin.change-requests.approve', request.id), {}, { preserveScroll: true });

    const reject = (request: ChangeRequest) => router.patch(route('admin.change-requests.reject', request.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title="Zahtevi za izmenu">
            <Head title="Zahtevi za izmenu" />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.change-requests.index', { status: tab.status })}
                        preserveScroll
                        className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {tab.label}
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums',
                                tab.status === 'pending' && counts.pending > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status]}
                        </span>
                    </Link>
                ))}
            </div>

            {requests.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">
                    {filters.status === 'pending' ? 'Nema zahteva koji čekaju odluku.' : 'Ovde još nema ničega.'}
                </p>
            ) : (
                <div className="mt-6 space-y-3">
                    {requests.map((request) => (
                        <div key={request.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="text-muted-foreground text-xs">
                                    {FIELD_LABELS[request.field] ?? request.field} · zatražio {request.requester.name} ·{' '}
                                    {formatRelativeTime(request.created_at)}
                                </p>

                                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-muted-foreground line-through">{request.current_value}</span>
                                    <ArrowRight className="text-muted-foreground size-3.5" />
                                    <span className="font-medium">{request.requested_value}</span>
                                </p>

                                <a
                                    href={route('marketplace.producers.show', request.producer.slug)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground mt-1 inline-block text-xs underline underline-offset-2"
                                >
                                    Otvori stranicu proizvođača
                                </a>
                            </div>

                            {request.status === 'pending' && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" onClick={() => approve(request)}>
                                        <Check className="size-4" />
                                        Odobri
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => reject(request)}>
                                        <X className="size-4" />
                                        Odbij
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
