import PaidItemActions, { CancelRequestedBadge, type PaidItemFields, RefundLine, TARGET_ROW } from '@/components/admin/paid-item-actions';
import SettingsPanel, { Saved } from '@/components/admin/settings-panel';
import StatusTabs from '@/components/admin/status-tabs';
import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Status = 'pending_payment' | 'active' | 'expired' | 'cancelled';

interface Subscription extends PaidItemFields {
    reference: string;
    ends_at: string | null;
    created_at: string;
    producer: { id: number; name: string; slug: string } | null;
    plan: { id: number; name: string } | null;
}

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

// Types, not interfaces: useForm needs the implicit index signature.
type PaymentDetails = {
    recipient: string;
    address: string;
    account: string;
    purpose: string;
    model: string;
    code: string;
};

interface Settings {
    plans: Plan[];
    featureLabels: Record<string, string>;
    payment: PaymentDetails;
    founding: { limit: number; claimed: number };
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: tx('Čekaju uplatu') },
    { status: 'active', label: tx('Aktivne') },
    { status: 'expired', label: tx('Istekle') },
    { status: 'cancelled', label: tx('Otkazane') },
];

function PlanForm({ plan, featureLabels }: { plan: Plan; featureLabels: Record<string, string> }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
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
        <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor={`name-${plan.id}`}>{t('Naziv')}</Label>
                    <Input id={`name-${plan.id}`} value={data.name} onChange={(event) => setData('name', event.target.value)} />
                    <InputError message={errors.name} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`price-${plan.id}`}>{t('Cena (RSD / godišnje)')}</Label>
                    <Input
                        id={`price-${plan.id}`}
                        type="number"
                        min={0}
                        value={data.price_rsd}
                        onChange={(event) => setData('price_rsd', Number(event.target.value))}
                    />
                    <InputError message={errors.price_rsd} />
                </div>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`description-${plan.id}`}>{t('Opis')}</Label>
                <textarea
                    id={`description-${plan.id}`}
                    value={data.description}
                    onChange={(event) => setData('description', event.target.value)}
                    className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm"
                />
            </div>

            <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">{t('Šta paket nosi')}</legend>
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
                {t('Paket je u ponudi')}
            </label>

            <div className="flex items-center gap-3">
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj paket')}
                </Button>
                <Saved show={recentlySuccessful} />
            </div>
        </form>
    );
}

/**
 * The bank details printed on every payment slip. Edited here rather than in
 * a deployment file: they are not secret, not per-environment, and changing
 * a bank account should not need a developer.
 */
function PaymentForm({ payment }: { payment: PaymentDetails }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm(payment);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('admin.payment.update'), { preserveScroll: true });
    };

    const fields: { key: keyof PaymentDetails; label: string; hint?: string }[] = [
        { key: 'recipient', label: t('Primalac') },
        { key: 'address', label: t('Adresa primaoca') },
        { key: 'account', label: t('Račun primaoca'), hint: t('U obliku 000-0000000000000-00') },
        { key: 'purpose', label: t('Svrha uplate za članarinu'), hint: t('Naziv proizvođača se dodaje automatski') },
        { key: 'model', label: t('Model') },
        { key: 'code', label: t('Šifra plaćanja') },
    ];

    return (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
                <div key={field.key} className="grid gap-1.5">
                    <Label htmlFor={`payment-${field.key}`}>{field.label}</Label>
                    <Input id={`payment-${field.key}`} value={data[field.key]} onChange={(event) => setData(field.key, event.target.value)} />
                    {field.hint && <p className="text-muted-foreground text-xs">{field.hint}</p>}
                    <InputError message={errors[field.key]} />
                </div>
            ))}

            <div className="flex items-center gap-3 sm:col-span-2">
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj podatke za uplatu')}
                </Button>
                <Saved show={recentlySuccessful} />
            </div>
        </form>
    );
}

function FoundingForm({ founding }: { founding: { limit: number; claimed: number } }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({ limit: founding.limit });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('admin.founding.update'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
                <Label htmlFor="founding-limit">{t('Broj mesta za osnivače')}</Label>
                <Input
                    id="founding-limit"
                    type="number"
                    min={founding.claimed}
                    className="w-32"
                    value={data.limit}
                    onChange={(e) => setData('limit', Number(e.target.value))}
                />
                <InputError message={errors.limit} />
            </div>
            <div className="flex items-center gap-3 pb-0.5">
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj')}
                </Button>
                <Saved show={recentlySuccessful} />
            </div>
        </form>
    );
}

function SettingsTab({ settings }: { settings: Settings }) {
    return (
        <div className="mt-6 max-w-3xl space-y-8">
            <section>
                <h2 className="font-serif text-2xl">{t('Paketi članarine')}</h2>
                <p className="text-muted-foreground mt-1 mb-4 text-sm">
                    {t('Cene i šta koji paket donosi. Nova cena važi za zahteve od sada; već zatraženi zadržavaju svoju.')}
                </p>
                <div className="space-y-3">
                    {settings.plans.map((plan) => (
                        <SettingsPanel
                            key={plan.id}
                            title={plan.name}
                            summary={`${formatNumber(plan.price_rsd)} RSD / ${t('god')} · ${plan.is_active ? t('u ponudi') : t('nije u ponudi')}`}
                        >
                            <PlanForm plan={plan} featureLabels={settings.featureLabels} />
                        </SettingsPanel>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-serif text-2xl">{t('Uplate i osnivači')}</h2>
                <SettingsPanel
                    title={t('Podaci za uplatnicu')}
                    summary={`${settings.payment.recipient} · ${settings.payment.account}`}
                    lead={t('Štampa se na svakoj uplatnici i ugrađuje u QR kod — za članarine, isticanja i kampanje.')}
                >
                    <PaymentForm payment={settings.payment} />
                </SettingsPanel>
                <SettingsPanel
                    title={t('Osnivači')}
                    summary={t('Dodeljeno :claimed od :limit mesta', { claimed: settings.founding.claimed, limit: settings.founding.limit })}
                    lead={t(
                        'Prvi odobreni proizvođači dobijaju trajni redni broj i godinu dana Premium članstva besplatno. Broj ne može biti manji od već dodeljenih mesta.',
                    )}
                >
                    <FoundingForm founding={settings.founding} />
                </SettingsPanel>
            </section>
        </div>
    );
}

/**
 * Memberships (task 20.9): plans, slip details and founding places on the
 * settings tab; the payments by status on the others. Confirming a payment
 * is a human step on purpose - somebody has to see the bank statement.
 */
export default function AdminMemberships({
    subscriptions,
    settings,
    filters,
    counts,
}: {
    subscriptions: Paginated<Subscription> | null;
    settings: Settings | null;
    filters: { status: Status | 'settings' };
    counts: Record<string, number>;
}) {
    const confirm = (subscription: Subscription) => router.patch(route('admin.memberships.confirm', subscription.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title={t('Članarine')}>
            <Head title={t('Članarine')} />

            <StatusTabs
                routeName="admin.memberships.index"
                current={filters.status}
                settingsLabel={tx('Paketi i uplate')}
                tabs={TABS}
                counts={counts}
            />

            {settings && <SettingsTab settings={settings} />}

            {subscriptions &&
                (subscriptions.data.length === 0 ? (
                    <p className="text-muted-foreground mt-6 text-sm">{t('Ovde nema ničega.')}</p>
                ) : (
                    <div className="mt-6 space-y-3">
                        {subscriptions.data.map((subscription) => (
                            <div key={subscription.id} id={subscription.anchor} className={cn('rounded-xl border p-4', TARGET_ROW)}>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 font-medium">
                                            {subscription.producer?.name ?? t('Obrisan proizvođač')} · {subscription.plan?.name}
                                            {subscription.status === 'active' && <CancelRequestedBadge at={subscription.cancel_requested_at} />}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {t('Poziv na broj')} <span className="text-foreground font-medium">{subscription.reference}</span> ·{' '}
                                            {formatNumber(subscription.amount_rsd)} RSD ·{' '}
                                            {t('zatraženo :when', { when: formatRelativeTime(subscription.created_at) })}
                                            {subscription.ends_at && ` · ${t('važi do :date', { date: formatDate(subscription.ends_at) })}`}
                                        </p>
                                    </div>

                                    <PaidItemActions
                                        item={subscription}
                                        what={t('članarinu za :name', { name: subscription.producer?.name ?? '' })}
                                        onConfirm={() => confirm(subscription)}
                                    />
                                </div>
                                <RefundLine item={subscription} />
                            </div>
                        ))}
                    </div>
                ))}

            {subscriptions && <Pagination meta={subscriptions} />}
        </AdminLayout>
    );
}
