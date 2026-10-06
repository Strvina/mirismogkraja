import InputError from '@/components/input-error';
import CompactSelect from '@/components/marketplace/compact-select';
import { WANTED_STATE_LABELS, WantedAdFacts, type WantedAdState, type WantedAdSummary } from '@/components/marketplace/wanted-ad-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { EyeOff } from 'lucide-react';
import { type FormEventHandler } from 'react';

interface Responder {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    logo_path: string | null;
}

/** One of the reader's producers, and whether it has answered this ad. */
interface OwnProducer {
    id: number;
    name: string;
    answered: boolean;
}

/**
 * One "Tražim" ad. Three readers, three pages in one: a visitor reads it,
 * a producer answers it, and its author sees who answered and closes it.
 */
export default function WantedShow({
    ad,
    isAuthor,
    responders,
    producers,
    canRespond,
}: {
    ad: WantedAdSummary & { body: string; state: WantedAdState; expires_at: string };
    isAuthor: boolean;
    /** For the author: the producers who answered. */
    responders: Responder[];
    /** For a producer: the reader's own approved producers. */
    producers: OwnProducer[];
    canRespond: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Tražim'), href: '/trazim' },
        { title: ad.title, href: `/trazim/${ad.id}` },
    ];

    const waiting = producers.filter((producer) => !producer.answered);
    const { data, setData, post, processing, errors } = useForm({ producer_id: waiting[0]?.id ?? 0, body: '' });

    const respond: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('wanted.respond', ad.id));
    };

    const close = () => router.patch(route('wanted.close', ad.id), {}, { preserveScroll: true });

    const destroy = async () => {
        if (await ask({ title: t('Obrisati oglas „:name”?', { name: ad.title }), tone: 'danger' })) {
            router.delete(route('wanted.destroy', ad.id));
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t(':title | Tražim', { title: ad.title })} />

            <article className="max-w-2xl">
                {ad.state !== 'open' && (
                    <p className="border-border/70 bg-muted/50 mb-6 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
                        <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {t('Ovaj oglas više nije javan (:state).', { state: t(WANTED_STATE_LABELS[ad.state]).toLowerCase() })}
                    </p>
                )}

                <WantedAdFacts ad={ad} />
                <h1 className="mt-2 font-serif text-4xl leading-tight break-words sm:text-5xl">{ad.title}</h1>
                <p className="text-muted-foreground mt-3 text-sm">
                    {ad.author} · {formatRelativeTime(ad.created_at)}
                    {ad.state === 'open' && <> · {t('otvoren do :date', { date: formatDate(ad.expires_at, { day: 'numeric', month: 'long' }) })}</>}
                </p>

                <div className="mt-6 text-base leading-8 break-words whitespace-pre-line">{ad.body}</div>

                {isAuthor && (
                    <section className="border-border/70 mt-10 border-t pt-6">
                        <h2 className="font-serif text-2xl">{t('Ko se javio')}</h2>
                        {responders.length === 0 ? (
                            <p className="text-muted-foreground mt-3 text-sm">
                                {t('Još niko. Čim se neki proizvođač javi, njegova poruka stiže u vaše poruke i na e-mail.')}
                            </p>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {responders.map((producer) => (
                                    <li key={producer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                                        <Link href={route('marketplace.producers.show', producer.slug)} className="flex min-w-0 items-center gap-3">
                                            {producer.logo_path ? (
                                                <img
                                                    src={thumbUrl(producer.logo_path)}
                                                    alt=""
                                                    className="size-10 shrink-0 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full font-serif">
                                                    {producer.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            <span className="min-w-0">
                                                <span className="block font-medium break-words">{producer.name}</span>
                                                {producer.city && <span className="text-muted-foreground block text-xs">{producer.city}</span>}
                                            </span>
                                        </Link>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={route('messages.show', producer.slug)}>{t('Otvori razgovor')}</Link>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-6 flex flex-wrap gap-2">
                            {ad.state === 'open' && (
                                <Button variant="outline" size="sm" onClick={close}>
                                    {t('Našao/la sam — zatvori oglas')}
                                </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={destroy}>
                                {t('Obriši')}
                            </Button>
                        </div>
                    </section>
                )}

                {!isAuthor && ad.state === 'open' && (
                    <section className="border-border/70 mt-10 border-t pt-6">
                        <h2 className="font-serif text-2xl">{t('Imate ovo u ponudi?')}</h2>

                        {canRespond && waiting.length > 0 && (
                            <form onSubmit={respond} className="mt-4 space-y-4">
                                <p className="text-muted-foreground text-sm leading-6">
                                    {t(
                                        'Vaš odgovor otvara razgovor sa kupcem u porukama. Na jedan oglas odgovarate jednom, pa napišite šta nudite, po kojoj ceni i kako isporučujete.',
                                    )}
                                </p>

                                {waiting.length > 1 && (
                                    <CompactSelect
                                        id="respond-as"
                                        className="w-64"
                                        value={String(data.producer_id)}
                                        onChange={(value) => setData('producer_id', Number(value))}
                                        options={waiting.map((producer) => ({ value: String(producer.id), label: producer.name }))}
                                    />
                                )}

                                <textarea
                                    value={data.body}
                                    maxLength={2000}
                                    onChange={(e) => setData('body', e.target.value)}
                                    placeholder={t('Zdravo, imamo to što tražite…')}
                                    aria-label={t('Odgovor kupcu')}
                                    className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
                                    required
                                />
                                <InputError message={errors.body ?? errors.producer_id} />

                                <Button type="submit" disabled={processing || !data.body.trim()}>
                                    {t('Pošalji ponudu')}
                                </Button>
                            </form>
                        )}

                        {producers.length > 0 && waiting.length === 0 && (
                            <p className="text-muted-foreground mt-3 text-sm">
                                {t('Već ste odgovorili na ovaj oglas.')}{' '}
                                <Link href={route('messages.index')} className="text-foreground font-medium underline underline-offset-4">
                                    {t('Nastavite u porukama')}
                                </Link>
                                .
                            </p>
                        )}

                        {producers.length === 0 && (
                            <p className="text-muted-foreground mt-3 text-sm leading-6">
                                {t('Na oglase odgovaraju proizvođači sa odobrenom stranicom.')}{' '}
                                <Link
                                    href={auth.user ? route('producers.index') : route('login')}
                                    className="text-foreground font-medium underline underline-offset-4"
                                >
                                    {auth.user ? t('Moji proizvođači') : t('Prijavite se')}
                                </Link>
                                .
                            </p>
                        )}
                    </section>
                )}
            </article>
        </MarketplaceLayout>
    );
}
