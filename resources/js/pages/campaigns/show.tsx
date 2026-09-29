import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarHeart } from 'lucide-react';

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
}

/** "12. oktobar" / "12 October" / "12 октября". */
function longDay(date: string): string {
    return formatDate(date, { day: 'numeric', month: 'long' });
}

function daysLeft(endsOn: string): number {
    const today = new Date(new Date().toDateString()).getTime();
    return Math.max(0, Math.round((new Date(endsOn).getTime() - today) / 86_400_000));
}

/** A seasonal campaign's page (task 20.3): the theme, and who takes part. */
export default function CampaignShow({ campaign, producers }: { campaign: Campaign; producers: ProducerCardProducer[] }) {
    const { auth } = usePage<SharedData>().props;
    const left = daysLeft(campaign.ends_on);

    return (
        <MarketplaceLayout>
            <Head title={campaign.name} />

            <section className="bg-primary text-primary-foreground rounded-2xl px-6 py-10 sm:px-10">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase opacity-85">
                    <CalendarHeart className="size-4" aria-hidden />
                    {t('Sezonska kampanja')} · {longDay(campaign.starts_on)} – {longDay(campaign.ends_on)}
                </p>
                <h1 className="mt-3 font-serif text-4xl break-words sm:text-6xl">{campaign.name}</h1>
                {campaign.description && <p className="mt-4 max-w-2xl leading-7 whitespace-pre-line opacity-90">{campaign.description}</p>}
                <p className="mt-6 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                    {left === 0 ? t('Poslednji dan') : left === 1 ? t('Traje još 1 dan') : t('Traje još :count dana', { count: left })}
                </p>
            </section>

            <h2 className="mt-10 font-serif text-2xl">{t('Proizvođači u kampanji')}</h2>
            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                    Proizvođači se upravo prijavljuju.{' '}
                    <Link href={route('marketplace.producers.index')} className="underline">
                        {t('Pogledajte sve proizvođače')}
                    </Link>
                </p>
            ) : (
                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {producers.map((producer) => (
                        <ProducerCard key={producer.id} producer={producer} />
                    ))}
                </div>
            )}

            {/* Producers find out about campaigns here too. */}
            <aside className="border-border/70 bg-muted/30 mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6">
                <div>
                    <p className="font-serif text-xl">{t('Pravite nešto za ovu sezonu?')}</p>
                    <p className="text-muted-foreground mt-1 text-sm">{t('Pridružite se kampanji i budite ovde, pred kupcima koji traže baš to.')}</p>
                </div>
                <Button asChild variant="outline">
                    <Link href={auth.user ? route('campaigns.index') : route('register')}>{t('Pridružite se')}</Link>
                </Button>
            </aside>
        </MarketplaceLayout>
    );
}
