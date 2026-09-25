import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Status = 'pending_payment' | 'active' | 'expired' | 'cancelled';

interface Plan {
    id: number;
    name: string;
    description: string | null;
    price_rsd: number;
    duration_days: number;
    features: string[] | null;
    is_active: boolean;
    level: number;
}

interface Subscription {
    id: number;
    status: Status;
    reference: string;
    amount_rsd: number;
    ends_at: string | null;
    created_at: string;
    producer: { id: number; name: string; slug: string } | null;
    plan: { id: number; name: string } | null;
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: 'Čekaju uplatu' },
    { status: 'active', label: 'Aktivne' },
    { status: 'expired', label: 'Istekle' },
    { status: 'cancelled', label: 'Otkazane' },
];

const dinars = new Intl.NumberFormat('sr-RS');

function PlanForm({ plan, featureLabels }: { plan: Plan; featureLabels: Record<string, string> }) {
    const { data, setData, put, processing } = useForm({
        name: plan.name,
        description: plan.description ?? '',
        price_rsd: plan.price_rsd,
        duration_days: plan.duration_days,
        is_active: plan.is_active,
        features: plan.features ?? [],
    });

    const toggle = (feature: string, checked: boolean) =>
        setData('features', checked ? [...data.features, feature] : data.features.filter((item) => item !== feature));

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('admin.plans.update', plan.id), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="grid gap-3 rounded-xl border p-4">
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor={`name-${plan.id}`}>Naziv</Label>
                    <Input id={`name-${plan.id}`} value={data.name} onChange={(event) => setData('name', event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`price-${plan.id}`}>Cena (RSD / godišnje)</Label>
                    <Input
                        id={`price-${plan.id}`}
                        type="number"
                        min={0}
                        value={data.price_rsd}
                        onChange={(event) => setData('price_rsd', Number(event.target.value))}
                    />
                </div>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`description-${plan.id}`}>Opis</Label>
                <textarea
                    id={`description-${plan.id}`}
                    value={data.description}
                    onChange={(event) => setData('description', event.target.value)}
                    className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm"
                />
            </div>

            <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Šta paket nosi</legend>
                {Object.entries(featureLabels).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary size-4 rounded border"
                            checked={data.features.includes(key)}
                            onChange={(event) => toggle(key, event.target.checked)}
                        />
                        {label}
                    </label>
                ))}
            </fieldset>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                    type="checkbox"
                    className="border-input text-primary size-4 rounded border"
                    checked={data.is_active}
                    onChange={(event) => setData('is_active', event.target.checked)}
                />
                Paket je u ponudi
            </label>

            <Button size="sm" disabled={processing} className="w-fit">
                Sačuvaj paket
            </Button>
        </form>
    );
}

/**
 * Monetisation in the panel (task 20.9). Confirming a payment is a human
 * step on purpose: the money comes in on a bank slip, so someone has to see
 * the statement and say it arrived.
 */
export default function AdminMemberships({
    plans,
    featureLabels,
    subscriptions,
    filters,
    counts,
    revenue,
}: {
    plans: Plan[];
    featureLabels: Record<string, string>;
    subscriptions: Subscription[];
    filters: { status: Status };
    counts: Record<Status, number>;
    revenue: { plan: string; count: number; total: number }[];
}) {
    const [editingPlans, setEditingPlans] = useState(false);

    const confirm = (subscription: Subscription) => router.patch(route('admin.memberships.confirm', subscription.id), {}, { preserveScroll: true });

    const cancel = (subscription: Subscription) => router.patch(route('admin.memberships.cancel', subscription.id), {}, { preserveScroll: true });

    const earned = revenue.reduce((sum, row) => sum + row.total, 0);

    return (
        <AdminLayout title="Članarine">
            <Head title="Članarine" />

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                    <p className="text-muted-foreground text-sm">Ukupno naplaćeno</p>
                    <p className="mt-1 font-serif text-2xl">{dinars.format(earned)} RSD</p>
                </div>
                {revenue.map((row) => (
                    <div key={row.plan} className="rounded-xl border p-4">
                        <p className="text-muted-foreground text-sm">{row.plan}</p>
                        <p className="mt-1 font-serif text-2xl">{dinars.format(row.total)} RSD</p>
                        <p className="text-muted-foreground text-xs">{row.count} uplata</p>
                    </div>
                ))}
            </div>

            <div className="border-border/70 mt-8 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.memberships.index', { status: tab.status })}
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

            {subscriptions.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">Ovde nema ničega.</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {subscriptions.map((subscription) => (
                        <div key={subscription.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {subscription.producer?.name ?? 'Obrisan proizvođač'} · {subscription.plan?.name}
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Poziv na broj <span className="text-foreground font-medium">{subscription.reference}</span> ·{' '}
                                    {dinars.format(subscription.amount_rsd)} RSD · zatraženo {formatRelativeTime(subscription.created_at)}
                                    {subscription.ends_at && ` · važi do ${new Date(subscription.ends_at).toLocaleDateString('sr-RS')}`}
                                </p>
                            </div>

                            {subscription.status === 'pending_payment' && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" onClick={() => confirm(subscription)}>
                                        <Check className="size-4" />
                                        Uplata primljena
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => cancel(subscription)}>
                                        <X className="size-4" />
                                        Otkaži
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <section className="mt-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-serif text-2xl">Paketi i cene</h2>
                    <Button variant="outline" size="sm" onClick={() => setEditingPlans((value) => !value)}>
                        {editingPlans ? 'Sakrij' : 'Izmeni pakete'}
                    </Button>
                </div>

                {editingPlans ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <PlanForm key={plan.id} plan={plan} featureLabels={featureLabels} />
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        {plans.map((plan) => (
                            <div key={plan.id} className="rounded-xl border p-4">
                                <p className="font-serif text-xl">{plan.name}</p>
                                <p className="mt-1 font-serif text-2xl">{dinars.format(plan.price_rsd)} RSD</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {plan.duration_days} dana · {plan.is_active ? 'u ponudi' : 'povučen'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}
