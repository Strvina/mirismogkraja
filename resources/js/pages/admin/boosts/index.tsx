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

interface BoostRow extends PaidItemFields {
    kind: 'profile' | 'product';
    name: string;
    producer: { id: number; name: string; slug: string } | null;
    reference: string;
    days: number;
    ends_at: string | null;
    created_at: string;
}

// A type, not an interface: useForm needs the implicit index signature.
type BoostTerms = {
    profile_price: number;
    product_price: number;
    days: number;
};

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: tx('Čekaju uplatu') },
    { status: 'active', label: tx('Aktivna') },
    { status: 'expired', label: tx('Istekla') },
    { status: 'cancelled', label: tx('Otkazana') },
];

function BoostTermsForm({ terms }: { terms: BoostTerms }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm(terms);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('admin.boosts.terms'), { preserveScroll: true });
    };

    const fields: { key: keyof BoostTerms; label: string }[] = [
        { key: 'profile_price', label: t('Isticanje profila (RSD)') },
        { key: 'product_price', label: t('Isticanje proizvoda (RSD)') },
        { key: 'days', label: t('Trajanje (dana)') },
    ];

    return (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
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
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj')}
                </Button>
                <Saved show={recentlySuccessful} />
            </div>
        </form>
    );
}

/**
 * Paid boosts: prices on the settings tab, the payments by status on the
 * others. Each tab loads only its own data.
 */
export default function AdminBoosts({
    boosts,
    terms,
    filters,
    counts,
}: {
    boosts: Paginated<BoostRow> | null;
    terms: BoostTerms | null;
    filters: { status: Status | 'settings' };
    counts: Record<string, number>;
}) {
    const confirm = (boost: BoostRow) => router.patch(route('admin.boosts.confirm', boost.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title={t('Isticanja')}>
            <Head title={t('Isticanja')} />

            <StatusTabs routeName="admin.boosts.index" current={filters.status} settingsLabel={tx('Cene i trajanje')} tabs={TABS} counts={counts} />

            {terms && (
                <div className="mt-6 max-w-3xl">
                    <SettingsPanel
                        title={t('Cene i trajanje isticanja')}
                        summary={t('Profil :profile RSD · proizvod :product RSD · :days dana', {
                            profile: formatNumber(terms.profile_price),
                            product: formatNumber(terms.product_price),
                            days: terms.days,
                        })}
                        lead={t('Važe za isticanja zatražena od sada; već zatražena zadržavaju svoju cenu.')}
                        defaultOpen
                    >
                        <BoostTermsForm terms={terms} />
                    </SettingsPanel>
                </div>
            )}

            {boosts &&
                (boosts.data.length === 0 ? (
                    <p className="text-muted-foreground mt-6 text-sm">{t('Ovde nema ničega.')}</p>
                ) : (
                    <div className="mt-6 space-y-3">
                        {boosts.data.map((boost) => (
                            <div key={boost.id} id={boost.anchor} className={cn('rounded-xl border p-4', TARGET_ROW)}>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 font-medium break-words">
                                            {boost.name}
                                            <span className="text-muted-foreground font-normal">
                                                · {boost.kind === 'product' ? t('proizvod') : t('profil')}
                                            </span>
                                            {boost.status === 'active' && <CancelRequestedBadge at={boost.cancel_requested_at} />}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {boost.producer?.name ?? t('Obrisan proizvođač')} · {t('poziv na broj')}{' '}
                                            <span className="text-foreground font-medium">{boost.reference}</span> · {formatNumber(boost.amount_rsd)}{' '}
                                            RSD · {t(':days dana', { days: boost.days })} ·{' '}
                                            {t('zatraženo :when', { when: formatRelativeTime(boost.created_at) })}
                                            {boost.ends_at && ` · ${t('do :date', { date: formatDate(boost.ends_at) })}`}
                                        </p>
                                    </div>

                                    <PaidItemActions
                                        item={boost}
                                        what={t('isticanje „:name”', { name: boost.name })}
                                        onConfirm={() => confirm(boost)}
                                    />
                                </div>
                                <RefundLine item={boost} />
                            </div>
                        ))}
                    </div>
                ))}

            {boosts && <Pagination meta={boosts} />}
        </AdminLayout>
    );
}
