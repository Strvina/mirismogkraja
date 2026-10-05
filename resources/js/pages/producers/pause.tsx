import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const NOTE_MAX = 200;

/**
 * The owner's switch for a pause. Turning it on keeps the page online and
 * stops new conversations; a return date, if given, ends it by itself.
 */
export default function ProducerPause({
    producer,
    pause,
    followersCount,
    maxDate,
}: {
    producer: Pick<Producer, 'id' | 'name'>;
    pause: { paused: boolean; until: string | null; note: string | null };
    followersCount: number;
    /** The furthest return date the form accepts. */
    maxDate: string;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/pauza` },
    ];

    const { data, setData, transform, put, processing, errors } = useForm({ until: pause.until ?? '', note: pause.note ?? '' });
    const today = new Date().toISOString().slice(0, 10);

    const save = (paused: boolean) => {
        transform((form) => ({ ...form, paused }));
        put(route('producers.pause.update', producer.id), { preserveScroll: true });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        save(true);
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Pauza')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Pauza')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t(
                    'Rasprodali ste, idete na odmor ili čekate novu sezonu? Uključite pauzu: stranica i proizvodi ostaju vidljivi, a novi kupci ne mogu da pošalju upit dok se ne vratite. Razgovori koje ste već započeli teku dalje.',
                )}
            </p>

            {pause.paused && (
                <div className="border-gold/50 bg-cream-deep mt-8 flex max-w-xl flex-wrap items-center justify-between gap-4 rounded-lg border p-5">
                    <div className="min-w-0 text-sm leading-6">
                        <p className="font-medium">
                            {pause.until
                                ? t('Pauza je uključena do :date.', { date: formatDate(pause.until, { day: 'numeric', month: 'long' }) })
                                : t('Pauza je uključena.')}
                        </p>
                        <p className="text-muted-foreground">
                            {followersCount > 0
                                ? t('Kad je isključite, javićemo onima koji vas prate (:count).', { count: followersCount })
                                : t('Isključite je čim ponovo budete mogli da odgovarate.')}
                        </p>
                    </div>
                    <Button onClick={() => save(false)} disabled={processing}>
                        {t('Isključi pauzu')}
                    </Button>
                </div>
            )}

            <form onSubmit={submit} className="mt-8 max-w-xl space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="pause-until">{t('Vraćam se (neobavezno)')}</Label>
                    <Input
                        id="pause-until"
                        type="date"
                        min={today}
                        max={maxDate}
                        value={data.until}
                        onChange={(e) => setData('until', e.target.value)}
                        className="max-w-[14rem]"
                    />
                    <p className="text-muted-foreground text-xs">
                        {t('Ako upišete datum, pauza se tog dana završava sama. Bez datuma traje dok je ne isključite.')}
                    </p>
                    <InputError message={errors.until} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="pause-note">{t('Poruka posetiocima (neobavezno)')}</Label>
                    <textarea
                        id="pause-note"
                        value={data.note}
                        maxLength={NOTE_MAX}
                        onChange={(e) => setData('note', e.target.value)}
                        placeholder={t('Na primer: Ovogodišnji ajvar je rasprodat, novi stiže u septembru.')}
                        className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                        {data.note.length} / {NOTE_MAX}
                    </p>
                    <InputError message={errors.note} />
                </div>

                <Button type="submit" variant={pause.paused ? 'outline' : 'default'} disabled={processing}>
                    {pause.paused ? t('Sačuvaj izmene') : t('Uključi pauzu')}
                </Button>
            </form>
        </MarketplaceLayout>
    );
}
