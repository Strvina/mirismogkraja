import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatDays, WEEKDAYS } from '@/lib/weekdays';
import { type BreadcrumbItem, type Producer, type ProducerMarket } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

interface MarketForm {
    name: string;
    city: string;
    days: number[];
    opens_at: string;
    closes_at: string;
    note: string;
}

const EMPTY: MarketForm = { name: '', city: '', days: [], opens_at: '', closes_at: '', note: '' };

/** "Gde me nađete": the owner enters the markets they sell at and on which days. */
export default function ProducerMarkets({
    producer,
    markets,
    limit,
}: {
    producer: Pick<Producer, 'id' | 'name' | 'slug' | 'status'>;
    markets: ProducerMarket[];
    limit: number;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/pijace` },
    ];

    // The one form adds a place or, after "Izmeni", rewrites one.
    const [editing, setEditing] = useState<ProducerMarket | null>(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<MarketForm>(EMPTY);
    const full = markets.length >= limit && !editing;

    const startEditing = (market: ProducerMarket) => {
        clearErrors();
        setEditing(market);
        setData({
            name: market.name,
            city: market.city ?? '',
            days: market.days,
            opens_at: market.opens_at ?? '',
            closes_at: market.closes_at ?? '',
            note: market.note ?? '',
        });
    };

    const stopEditing = () => {
        clearErrors();
        setEditing(null);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: stopEditing };

        if (editing) {
            put(route('producers.markets.update', [producer.id, editing.id]), options);
        } else {
            post(route('producers.markets.store', producer.id), options);
        }
    };

    const toggleDay = (day: number) => setData('days', data.days.includes(day) ? data.days.filter((d) => d !== day) : [...data.days, day]);

    const destroy = async (market: ProducerMarket) => {
        if (await ask({ title: t('Obrisati mesto „:name”?', { name: market.name }), tone: 'danger' })) {
            router.delete(route('producers.markets.destroy', [producer.id, market.id]), {
                preserveScroll: true,
                onSuccess: () => editing?.id === market.id && stopEditing(),
            });
        }
    };

    const dayError = errors.days ?? Object.entries(errors).find(([key]) => key.startsWith('days.'))?.[1];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Gde me nađete')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Gde me nađete')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t(
                    'Pijace, sajmovi i prodavnice na kojima prodajete uživo. Kupci to vide na vašem profilu i u katalogu, uz oznaku „Danas” kada ste tamo.',
                )}
            </p>

            {markets.length > 0 && (
                <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
                    {markets.map((market) => (
                        <li key={market.id} className={cn('rounded-xl border p-4 text-sm', editing?.id === market.id && 'border-primary/60')}>
                            <p className="font-medium break-words">{market.name}</p>
                            <p className="text-muted-foreground mt-1">
                                {[market.city, formatDays(market.days), market.opens_at && `${market.opens_at}–${market.closes_at}`]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                            {market.note && <p className="text-muted-foreground mt-1 text-xs break-words">{market.note}</p>}
                            <div className="mt-3 flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => startEditing(market)}>
                                    <Pencil className="size-4" />
                                    {t('Izmeni')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => destroy(market)}>
                                    <Trash2 className="size-4" />
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {full ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    {t('Uneli ste najveći broj mesta (:max). Obrišite neko da biste dodali novo.', { max: limit })}
                </p>
            ) : (
                <form onSubmit={submit} className="mt-10 max-w-xl space-y-5">
                    <h2 className="font-serif text-2xl">{editing ? t('Izmena mesta') : t('Dodaj mesto')}</h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="market-name">{t('Naziv mesta')}</Label>
                            <Input
                                id="market-name"
                                value={data.name}
                                maxLength={120}
                                required
                                placeholder={t('npr. Zelena pijaca Tvrđava, tezga 14')}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="market-city">{t('Mesto')}</Label>
                            <Input id="market-city" value={data.city} maxLength={80} onChange={(e) => setData('city', e.target.value)} />
                            <InputError message={errors.city} />
                        </div>
                    </div>

                    <fieldset>
                        <legend className="text-sm font-medium">{t('Dani')}</legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {WEEKDAYS.map((day) => {
                                const on = data.days.includes(day.value);

                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        aria-pressed={on}
                                        aria-label={t(day.long)}
                                        onClick={() => toggleDay(day.value)}
                                        className={cn(
                                            'min-h-11 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors',
                                            on ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted',
                                        )}
                                    >
                                        {t(day.short)}
                                    </button>
                                );
                            })}
                        </div>
                        <InputError message={dayError} className="mt-2" />
                    </fieldset>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="market-opens">{t('Od')}</Label>
                            <Input id="market-opens" type="time" value={data.opens_at} onChange={(e) => setData('opens_at', e.target.value)} />
                            <InputError message={errors.opens_at} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="market-closes">{t('Do')}</Label>
                            <Input id="market-closes" type="time" value={data.closes_at} onChange={(e) => setData('closes_at', e.target.value)} />
                            <InputError message={errors.closes_at} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="market-note">{t('Napomena (nije obavezno)')}</Label>
                        <Input
                            id="market-note"
                            value={data.note}
                            maxLength={160}
                            placeholder={t('npr. Samo u sezoni, od maja do oktobra')}
                            onChange={(e) => setData('note', e.target.value)}
                        />
                        <InputError message={errors.note} />
                    </div>

                    <div className="flex gap-2">
                        <Button disabled={processing}>{editing ? t('Sačuvaj izmene') : t('Dodaj mesto')}</Button>
                        {editing && (
                            <Button type="button" variant="outline" onClick={stopEditing}>
                                {t('Odustani')}
                            </Button>
                        )}
                    </div>
                </form>
            )}
        </MarketplaceLayout>
    );
}
