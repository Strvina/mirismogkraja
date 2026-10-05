import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, Download, X } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

type Status = 'pending' | 'approved' | 'rejected';

interface Certificate {
    id: number;
    producer_id: number;
    type: string;
    title: string;
    issuer: string | null;
    issued_on: string | null;
    expires_on: string | null;
    status: Status;
    rejection_reason: string | null;
    expired: boolean;
    created_at: string;
    /** Null when the producer has since been archived. */
    producer: { id: number; name: string; slug: string } | null;
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending', label: tx('Čekaju proveru') },
    { status: 'approved', label: tx('Potvrđeni') },
    { status: 'rejected', label: tx('Odbijeni') },
];

/** Turning a document down needs a sentence the producer can act on. */
function RejectForm({ certificate, onDone }: { certificate: Certificate; onDone: () => void }) {
    const { data, setData, patch, processing, errors } = useForm({ reason: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('admin.certificates.reject', certificate.id), { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="mt-3 flex w-full flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
                <Input
                    value={data.reason}
                    maxLength={255}
                    required
                    autoFocus
                    aria-label={t('Razlog odbijanja')}
                    placeholder={t('Razlog, npr. „Dokument je nečitak” ili „Rok važenja je istekao”')}
                    onChange={(e) => setData('reason', e.target.value)}
                />
                <InputError message={errors.reason} className="mt-1" />
            </div>
            <Button size="sm" variant="destructive" disabled={processing}>
                {t('Odbij')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDone}>
                {t('Odustani')}
            </Button>
        </form>
    );
}

/**
 * Producers' documents waiting to be checked. Open the document, compare it
 * with what the producer wrote, then confirm it or say what is wrong.
 */
export default function AdminCertificatesIndex({
    certificates,
    types,
    filters,
    counts,
}: {
    certificates: Paginated<Certificate>;
    types: Record<string, string>;
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const [rejecting, setRejecting] = useState<number | null>(null);

    const approve = (certificate: Certificate) => router.patch(route('admin.certificates.approve', certificate.id), {}, { preserveScroll: true });
    const day = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <AdminLayout title={t('Sertifikati')}>
            <Head title={t('Sertifikati')} />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.certificates.index', { status: tab.status })}
                        preserveScroll
                        className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t(tab.label)}
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

            {certificates.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">
                    {filters.status === 'pending' ? t('Nema sertifikata koji čekaju proveru.') : t('Ovde još nema ničega.')}
                </p>
            ) : (
                <div className="mt-6 space-y-3">
                    {certificates.data.map((certificate) => (
                        <div key={certificate.id} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-medium break-words">{certificate.title}</p>
                                    <p className="text-muted-foreground mt-1">
                                        {types[certificate.type] ?? certificate.type}
                                        {certificate.producer && (
                                            <>
                                                {' · '}
                                                <a
                                                    href={route('marketplace.producers.show', certificate.producer.slug)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="underline underline-offset-2"
                                                >
                                                    {certificate.producer.name}
                                                </a>
                                            </>
                                        )}
                                        {' · '}
                                        {formatRelativeTime(certificate.created_at)}
                                    </p>
                                    <dl className="text-muted-foreground mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                                        <div>
                                            <dt className="inline">{t('Izdao:')} </dt>
                                            <dd className="text-foreground inline break-words">{certificate.issuer ?? '—'}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline">{t('Izdat:')} </dt>
                                            <dd className="text-foreground inline">{certificate.issued_on ? day(certificate.issued_on) : '—'}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline">{t('Važi do:')} </dt>
                                            <dd className={cn('inline', certificate.expired ? 'text-destructive font-medium' : 'text-foreground')}>
                                                {certificate.expires_on ? day(certificate.expires_on) : t('bez roka')}
                                            </dd>
                                        </div>
                                    </dl>
                                    {certificate.rejection_reason && (
                                        <p className="text-destructive mt-2 text-xs break-words">
                                            {t('Razlog:')} {certificate.rejection_reason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {certificate.producer && (
                                        <Button asChild variant="outline" size="sm">
                                            {/* A file, not a page: a plain link so the browser downloads it. */}
                                            <a href={route('producers.certificates.file', [certificate.producer_id, certificate.id])}>
                                                <Download className="size-4" />
                                                {t('Dokument')}
                                            </a>
                                        </Button>
                                    )}
                                    {certificate.status !== 'approved' && (
                                        <Button size="sm" onClick={() => approve(certificate)}>
                                            <Check className="size-4" />
                                            {t('Potvrdi')}
                                        </Button>
                                    )}
                                    {certificate.status !== 'rejected' && rejecting !== certificate.id && (
                                        <Button variant="outline" size="sm" onClick={() => setRejecting(certificate.id)}>
                                            <X className="size-4" />
                                            {t('Odbij')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {rejecting === certificate.id && <RejectForm certificate={certificate} onDone={() => setRejecting(null)} />}
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={certificates} />
        </AdminLayout>
    );
}
