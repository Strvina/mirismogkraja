import InfoHint from '@/components/info-hint';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Lock } from 'lucide-react';

interface Stats {
    days: number;
    totals: Record<string, number>;
    daily: { date: string; views: number }[];
    topProducts: { id: number; name: string; slug: string; views: number }[];
}

/**
 * Shown, blurred, behind the lock. Made up on purpose: a producer without
 * the plan sees what the page looks like, never their real figures.
 */
const PREVIEW: Stats = {
    days: 30,
    totals: { profile_view: 412, product_view: 968, phone_reveal: 37, viber_click: 21, whatsapp_click: 9, email_click: 4 },
    daily: Array.from({ length: 30 }, (_, i) => ({ date: `preview-${i}`, views: 6 + ((i * 7) % 13) })),
    topProducts: [
        { id: 1, name: 'Bagremov med', slug: '', views: 211 },
        { id: 2, name: 'Domaći ajvar', slug: '', views: 164 },
        { id: 3, name: 'Kozji sir', slug: '', views: 97 },
    ],
};

interface WantedTerm {
    term: string;
    total: number;
}

/** Behind the lock, like the rest: an idea of the list, not the real one. */
const PREVIEW_WANTED: WantedTerm[] = [
    { term: 'kozji sir', total: 14 },
    { term: 'domaći kajmak', total: 9 },
    { term: 'sok od aronije', total: 6 },
];

/**
 * "Kupci traže, a niko ne nudi": what people searched the catalogue for and
 * did not find, on the whole site. A producer who makes one of these has
 * buyers waiting before the product is even listed.
 */
function WantedTerms({ terms, interactive }: { terms: WantedTerm[]; interactive: boolean }) {
    return (
        <section className="mt-10">
            <h2 className="font-serif text-2xl">{t('Kupci traže, a niko ne nudi')}</h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                {t('Šta su posetioci tražili u poslednjih 30 dana, a nije bilo na sajtu. Ako pravite nešto od ovoga, dodajte proizvod.')}
            </p>
            {terms.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">{t('Za sada nema takvih pretraga.')}</p>
            ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                    {terms.map((item) => (
                        <li key={item.term} className="border-border/70 rounded-full border px-3 py-1.5 text-sm">
                            {interactive ? item.term : <span>{item.term}</span>}
                            <span className="text-muted-foreground ml-2 tabular-nums">{item.total}×</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function formatDay(date: string): string {
    return formatDate(date, { day: 'numeric', month: 'numeric' });
}

function Dashboard({ stats, clickLabels, interactive }: { stats: Stats; clickLabels: Record<string, string>; interactive: boolean }) {
    const peak = Math.max(1, ...stats.daily.map((day) => day.views));
    const tiles = [
        { key: 'profile_view', label: t('Pregledi profila') },
        { key: 'product_view', label: t('Pregledi proizvoda') },
        ...Object.entries(clickLabels).map(([key, label]) => ({ key, label })),
    ];

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {tiles.map((tile) => (
                    <div key={tile.key} className="border-border/70 rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">{tile.label}</p>
                        <p className="mt-1 font-serif text-3xl">{stats.totals[tile.key] ?? 0}</p>
                    </div>
                ))}
            </div>

            <section>
                <h2 className="font-serif text-2xl">{t('Pregledi profila po danu')}</h2>
                <div
                    role="img"
                    aria-label={t('Ukupno :total pregleda profila za :days dana, najviše :peak u jednom danu.', {
                        total: stats.totals.profile_view ?? 0,
                        days: stats.days,
                        peak,
                    })}
                    className="border-border/70 mt-4 flex h-40 items-end gap-1 rounded-lg border p-3"
                >
                    {stats.daily.map((day) => (
                        <div
                            key={day.date}
                            title={interactive ? `${formatDay(day.date)}: ${day.views}` : undefined}
                            className="bg-primary/70 hover:bg-primary min-h-px flex-1 rounded-t-sm transition-colors"
                            style={{ height: `${(day.views / peak) * 100}%` }}
                        />
                    ))}
                </div>
            </section>

            <section>
                <h2 className="font-serif text-2xl">{t('Najgledaniji proizvodi')}</h2>
                {stats.topProducts.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">{t('Proizvodi još nisu imali preglede u ovom periodu.')}</p>
                ) : (
                    <ol className="mt-4 space-y-2">
                        {stats.topProducts.map((product, index) => (
                            <li key={product.id} className="border-border/70 flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                                <span className="min-w-0 break-words">
                                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                                    {interactive ? (
                                        <Link href={route('marketplace.products.show', product.slug)} className="font-medium hover:underline">
                                            {product.name}
                                        </Link>
                                    ) : (
                                        <span className="font-medium">{product.name}</span>
                                    )}
                                </span>
                                <span className="text-muted-foreground shrink-0">{product.views} pregleda</span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </div>
    );
}

export default function ProducerStatistics({
    producer,
    unlocked,
    stats,
    wanted,
    clickLabels,
}: {
    producer: { id: number; name: string; slug: string };
    unlocked: boolean;
    stats: Stats | null;
    /** Searches that found nothing, site-wide; null behind the lock. */
    wanted: WantedTerm[] | null;
    clickLabels: Record<string, string>;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: t('Statistika'), href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Statistika')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl break-words sm:text-5xl">{t('Statistika')}</h1>
            <p className="text-muted-foreground mt-2">
                {producer.name} · poslednjih {stats?.days ?? PREVIEW.days} dana.
                <InfoHint label={t('Šta se računa?')} title={t('Šta se računa')} className="ml-1 align-middle">
                    <p>
                        <strong>{t('Pregled')}</strong>{' '}
                        {t(
                            'je svaki put kada neko otvori vašu stranicu ili stranicu proizvoda. Ne računaju se vaše sopstvene posete, pretraživači i roboti.',
                        )}
                    </p>
                    <p>
                        <strong>{t('Prikaz telefona, Viber, WhatsApp i e-mail')}</strong>{' '}
                        {t('su kliknuti kontakti — najbolji znak da je neko zaista zainteresovan.')}
                    </p>
                    <p>{t('O posetiocima ne čuvamo ništa — samo broj po danu.')}</p>
                </InfoHint>
            </p>

            <div className="mt-8">
                {unlocked && stats ? (
                    <>
                        <Dashboard stats={stats} clickLabels={clickLabels} interactive />
                        <WantedTerms terms={wanted ?? []} interactive />
                    </>
                ) : (
                    <div className="relative">
                        <div aria-hidden className="pointer-events-none blur-sm select-none">
                            <Dashboard stats={PREVIEW} clickLabels={clickLabels} interactive={false} />
                            <WantedTerms terms={PREVIEW_WANTED} interactive={false} />
                        </div>
                        <div className="absolute inset-0 grid place-items-start justify-center pt-16">
                            <div className="bg-background max-w-sm rounded-lg border p-6 text-center shadow-lg">
                                <Lock className="text-primary mx-auto size-6" aria-hidden />
                                <h2 className="mt-3 font-serif text-2xl">{t('Statistika je deo paketa Premium i Pro')}</h2>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    {t(
                                        'Vidite koliko ljudi gleda vaš profil i proizvode, koliko njih traži vaš broj i javlja se preko Vibera ili WhatsApp-a, i šta se najviše gleda.',
                                    )}
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={route('memberships.index')}>{t('Pogledaj pakete')}</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
