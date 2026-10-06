import Head from '@/components/head';
import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { intlLocale, t } from '@/lib/i18n';
import { Link, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Pick {
    id: number;
    starts_on: string;
    producer: { id: number; name: string; slug: string } | null;
    product: { id: number; name: string; slug: string } | null;
}

const selectClasses = 'border-input bg-background h-10 w-full rounded-md border px-3 text-sm';

/** "28. 9. – 4. 10." for the week starting on the given Monday. */
function weekLabel(monday: string): string {
    const start = new Date(monday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const format = (date: Date) => date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'numeric' });

    return `${format(start)} – ${format(end)}`;
}

export default function AdminWeeklyPicks({
    picks,
    producers,
    suggestions,
    weeks,
    products = [],
}: {
    picks: Paginated<Pick>;
    producers: { id: number; name: string; recent: boolean }[];
    suggestions: { id: number; name: string }[];
    weeks: string[];
    products?: { id: number; name: string }[];
}) {
    const { data, setData, post, processing, errors, reset } = useForm({ producer_id: '', product_id: '', starts_on: weeks[0] });
    const currentWeek = weeks[0];

    const chooseProducer = (id: string) => {
        setData((current) => ({ ...current, producer_id: id, product_id: '' }));

        // Only this producer's products, fetched when they are chosen.
        if (id) {
            router.reload({ only: ['products'], data: { producer: id } });
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.weekly-picks.store'), { preserveScroll: true, onSuccess: () => reset() });
    };

    const remove = async (pick: Pick) => {
        if (
            await ask({
                title: t('Ukloniti ovaj izbor?'),
                description: t('Proizvođač više neće biti istaknut na početnoj strani za tu nedelju.'),
                confirmLabel: t('Ukloni'),
                tone: 'danger',
            })
        ) {
            router.delete(route('admin.weekly-picks.destroy', pick.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Proizvođač nedelje')}>
            <Head title={t('Proizvođač nedelje')} />

            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                {t(
                    'Izabrani proizvođač stoji na početnoj strani celu nedelju, od ponedeljka do nedelje. Proizvođači birani u poslednjih osam nedelja su označeni, da bi mesto kružilo.',
                )}
            </p>

            {suggestions.length > 0 && (
                <div className="mt-6">
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{t('Predlozi (Pro članovi)')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {suggestions.map((producer) => (
                            <button
                                key={producer.id}
                                type="button"
                                onClick={() => chooseProducer(String(producer.id))}
                                className="border-gold/40 hover:bg-muted rounded-full border px-3 py-1 text-sm"
                            >
                                {producer.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-3 sm:items-end">
                <div className="grid gap-1.5">
                    <Label htmlFor="pick-week">{t('Nedelja')}</Label>
                    <select id="pick-week" className={selectClasses} value={data.starts_on} onChange={(e) => setData('starts_on', e.target.value)}>
                        {weeks.map((week) => (
                            <option key={week} value={week}>
                                {weekLabel(week)}
                                {week === currentWeek ? ` (${t('ova nedelja')})` : ''}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.starts_on} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="pick-producer">{t('Proizvođač')}</Label>
                    <select id="pick-producer" className={selectClasses} value={data.producer_id} onChange={(e) => chooseProducer(e.target.value)}>
                        <option value="">{t('Izaberite…')}</option>
                        {producers.map((producer) => (
                            <option key={producer.id} value={producer.id}>
                                {producer.name}
                                {producer.recent ? ` · ${t('biran nedavno')}` : ''}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.producer_id} />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="pick-product">{t('Proizvod (opciono)')}</Label>
                    <select
                        id="pick-product"
                        className={selectClasses}
                        value={data.product_id}
                        disabled={!data.producer_id}
                        onChange={(e) => setData('product_id', e.target.value)}
                    >
                        <option value="">{t('Bez proizvoda')}</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.product_id} />
                </div>

                <div className="sm:col-span-3">
                    <Button disabled={processing || !data.producer_id}>{t('Sačuvaj izbor')}</Button>
                </div>
            </form>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">{t('Istorija')}</h2>
                {picks.data.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">{t('Još nijedan proizvođač nije biran.')}</p>
                ) : (
                    <ul className="mt-4 space-y-2">
                        {picks.data.map((pick) => (
                            <li
                                key={pick.id}
                                className="border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                            >
                                <span className="min-w-0">
                                    <span className="text-muted-foreground mr-3">{weekLabel(pick.starts_on)}</span>
                                    {pick.producer ? (
                                        <Link href={route('marketplace.producers.show', pick.producer.slug)} className="font-medium hover:underline">
                                            {pick.producer.name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">{t('Obrisan proizvođač')}</span>
                                    )}
                                    {pick.product && <span className="text-muted-foreground"> · {pick.product.name}</span>}
                                    {pick.starts_on.startsWith(currentWeek) && (
                                        <span className="bg-olive-soft text-olive ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                                            {t('sada')}
                                        </span>
                                    )}
                                </span>
                                <Button variant="ghost" size="icon" aria-label={t('Ukloni izbor')} onClick={() => remove(pick)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination meta={picks} />
            </section>
        </AdminLayout>
    );
}
