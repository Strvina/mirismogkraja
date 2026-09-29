import InfoHint from '@/components/info-hint';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
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

function formatDay(date: string): string {
    return new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
}

function Dashboard({ stats, clickLabels, interactive }: { stats: Stats; clickLabels: Record<string, string>; interactive: boolean }) {
    const peak = Math.max(1, ...stats.daily.map((day) => day.views));
    const tiles = [
        { key: 'profile_view', label: 'Pregledi profila' },
        { key: 'product_view', label: 'Pregledi proizvoda' },
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
                <h2 className="font-serif text-2xl">Pregledi profila po danu</h2>
                <div
                    role="img"
                    aria-label={`Ukupno ${stats.totals.profile_view ?? 0} pregleda profila za ${stats.days} dana, najviše ${peak} u jednom danu.`}
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
                <h2 className="font-serif text-2xl">Najgledaniji proizvodi</h2>
                {stats.topProducts.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Proizvodi još nisu imali preglede u ovom periodu.</p>
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
    clickLabels,
}: {
    producer: { id: number; name: string; slug: string };
    unlocked: boolean;
    stats: Stats | null;
    clickLabels: Record<string, string>;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moji proizvođači', href: '/moji-proizvodjaci' },
        { title: 'Statistika', href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`Statistika - ${producer.name}`} />

            <h1 className="font-serif text-4xl break-words sm:text-5xl">Statistika</h1>
            <p className="text-muted-foreground mt-2">
                {producer.name} · poslednjih {stats?.days ?? PREVIEW.days} dana.
                <InfoHint label="Šta se računa?" title="Šta se računa" className="ml-1 align-middle">
                    <p>
                        <strong>Pregled</strong> je svaki put kada neko otvori vašu stranicu ili stranicu proizvoda. Ne računaju se vaše sopstvene
                        posete, pretraživači i roboti.
                    </p>
                    <p>
                        <strong>Prikaz telefona, Viber, WhatsApp i e-mail</strong> su kliknuti kontakti — najbolji znak da je neko zaista
                        zainteresovan.
                    </p>
                    <p>O posetiocima ne čuvamo ništa — samo broj po danu.</p>
                </InfoHint>
            </p>

            <div className="mt-8">
                {unlocked && stats ? (
                    <Dashboard stats={stats} clickLabels={clickLabels} interactive />
                ) : (
                    <div className="relative">
                        <div aria-hidden className="pointer-events-none blur-sm select-none">
                            <Dashboard stats={PREVIEW} clickLabels={clickLabels} interactive={false} />
                        </div>
                        <div className="absolute inset-0 grid place-items-start justify-center pt-16">
                            <div className="bg-background max-w-sm rounded-lg border p-6 text-center shadow-lg">
                                <Lock className="text-primary mx-auto size-6" aria-hidden />
                                <h2 className="mt-3 font-serif text-2xl">Statistika je deo paketa Premium i Pro</h2>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    Vidite koliko ljudi gleda vaš profil i proizvode, koliko njih traži vaš broj i javlja se preko Vibera ili
                                    WhatsApp-a, i šta se najviše gleda.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={route('memberships.index')}>Pogledaj pakete</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
