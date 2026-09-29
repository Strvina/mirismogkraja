import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { t } from '@/lib/i18n';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

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

type BoostTerms = {
    profile_price: number;
    product_price: number;
    days: number;
};

function Saved({ show }: { show: boolean }) {
    return show ? <span className="text-olive text-sm">{t('Sačuvano')}</span> : null;
}

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
        <form onSubmit={submit} className="grid gap-3 rounded-xl border p-4">
            <div className="grid gap-2 sm:grid-cols-2">
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
                <legend className="text-sm font-medium">{t('Šta paket nosi')}</legend>
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
        <form onSubmit={submit} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3 sm:items-end">
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
        <form onSubmit={submit} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
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
        put(route('admin.billing.founding'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-xl border p-4">
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
            <p className="text-muted-foreground pb-2 text-sm">Dodeljeno: {founding.claimed}</p>
            <div className="flex items-center gap-3 pb-0.5">
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj')}
                </Button>
                <Saved show={recentlySuccessful} />
            </div>
        </form>
    );
}

function Section({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
    return (
        <section className="mt-12 first:mt-0">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">{lead}</p>
            {children}
        </section>
    );
}

/**
 * Everything that sets what producers pay, on its own page - the payment
 * queues are opened far more often and need none of it.
 */
export default function AdminBilling({
    plans,
    featureLabels,
    boostTerms,
    payment,
    founding,
}: {
    plans: Plan[];
    featureLabels: Record<string, string>;
    boostTerms: BoostTerms;
    payment: PaymentDetails;
    founding: { limit: number; claimed: number };
}) {
    return (
        <AdminLayout title={t('Naplata')}>
            <Head title={t('Naplata')} />

            <Section
                title={t('Paketi članarine')}
                lead={t('Cene i šta koji paket donosi. Nova cena važi za zahteve od sada; već zatraženi zadržavaju svoju.')}
            >
                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanForm key={plan.id} plan={plan} featureLabels={featureLabels} />
                    ))}
                </div>
            </Section>

            <Section title={t('Isticanje')} lead={t('Cene i trajanje isticanja. Važe za isticanja zatražena od sada.')}>
                <BoostTermsForm terms={boostTerms} />
            </Section>

            <Section title={t('Podaci za uplatnicu')} lead={t('Štampa se na svakoj uplatnici i ugrađuje u QR kod.')}>
                <PaymentForm payment={payment} />
            </Section>

            <Section
                title={t('Osnivači')}
                lead={t(
                    'Prvi odobreni proizvođači dobijaju trajni redni broj i godinu dana Premium članstva besplatno. Broj ne može biti manji od već dodeljenih mesta.',
                )}
            >
                <FoundingForm founding={founding} />
            </Section>
        </AdminLayout>
    );
}
