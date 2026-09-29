import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { FormEventHandler } from 'react';

type Status = 'pending_payment' | 'active' | 'expired' | 'cancelled';

// A type, not an interface: useForm needs the implicit index signature.
type Terms = {
    profile_price: number;
    product_price: number;
    days: number;
};

interface BoostRow {
    id: number;
    kind: 'profile' | 'product';
    name: string;
    producer: { id: number; name: string; slug: string } | null;
    status: Status;
    reference: string;
    amount_rsd: number;
    days: number;
    ends_at: string | null;
    created_at: string;
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: 'Čekaju uplatu' },
    { status: 'active', label: 'Aktivna' },
    { status: 'expired', label: 'Istekla' },
    { status: 'cancelled', label: 'Otkazana' },
];

const dinars = new Intl.NumberFormat('sr-RS');

function TermsForm({ terms }: { terms: Terms }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm(terms);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('admin.boosts.terms'), { preserveScroll: true });
    };

    const fields: { key: keyof Terms; label: string }[] = [
        { key: 'profile_price', label: 'Cena isticanja profila (RSD)' },
        { key: 'product_price', label: 'Cena isticanja proizvoda (RSD)' },
        { key: 'days', label: 'Trajanje (dana)' },
    ];

    return (
        <form onSubmit={submit} className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-3 sm:items-end">
            {fields.map((field) => (
                <div key={field.key} className="grid gap-1.5">
                    <Label htmlFor={`boost-${field.key}`}>{field.label}</Label>
                    <Input
                        id={`boost-${field.key}`}
                        type="number"
                        min={field.key === 'days' ? 1 : 0}
                        value={data[field.key]}
                        onChange={(e) => setData(field.key, Number(e.target.value))}
                    />
                    <InputError message={errors[field.key]} />
                </div>
            ))}
            <div className="flex items-center gap-3 sm:col-span-3">
                <Button disabled={processing}>Sačuvaj</Button>
                {recentlySuccessful && <span className="text-muted-foreground text-sm">Sačuvano. Važi za nova isticanja.</span>}
            </div>
        </form>
    );
}

export default function AdminBoosts({
    boosts,
    filters,
    counts,
    terms,
}: {
    boosts: Paginated<BoostRow>;
    filters: { status: Status };
    counts: Record<Status, number>;
    terms: Terms;
}) {
    const confirm = (boost: BoostRow) => router.patch(route('admin.boosts.confirm', boost.id), {}, { preserveScroll: true });
    const cancel = (boost: BoostRow) => router.patch(route('admin.boosts.cancel', boost.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title="Isticanja">
            <Head title="Isticanja" />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.boosts.index', { status: tab.status })}
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
                                tab.status === 'pending_payment' && counts.pending_payment > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status]}
                        </span>
                    </Link>
                ))}
            </div>

            {boosts.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">Ovde nema ničega.</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {boosts.data.map((boost) => (
                        <div key={boost.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium break-words">
                                    {boost.name}{' '}
                                    <span className="text-muted-foreground font-normal">· {boost.kind === 'product' ? 'proizvod' : 'profil'}</span>
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {boost.producer?.name ?? 'Obrisan proizvođač'} · poziv na broj{' '}
                                    <span className="text-foreground font-medium">{boost.reference}</span> · {dinars.format(boost.amount_rsd)} RSD ·{' '}
                                    {boost.days} dana · zatraženo {formatRelativeTime(boost.created_at)}
                                    {boost.ends_at && ` · do ${new Date(boost.ends_at).toLocaleDateString('sr-RS')}`}
                                </p>
                            </div>

                            {boost.status === 'pending_payment' && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" onClick={() => confirm(boost)}>
                                        <Check className="size-4" />
                                        Uplata primljena
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => cancel(boost)}>
                                        <X className="size-4" />
                                        Otkaži
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={boosts} />

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Cene i trajanje</h2>
                <p className="text-muted-foreground mt-1 text-sm">Važe za isticanja zatražena od sada; već zatražena zadržavaju svoju cenu.</p>
                <TermsForm terms={terms} />
            </section>
        </AdminLayout>
    );
}
