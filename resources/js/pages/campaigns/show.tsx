import { CampaignHero, type CampaignSummary } from '@/components/marketplace/campaign-banner';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

/** A seasonal campaign's page: the theme, and who takes part. */
export default function CampaignShow({ campaign, producers }: { campaign: CampaignSummary; producers: ProducerCardProducer[] }) {
    const { auth } = usePage<SharedData>().props;

    return (
        <MarketplaceLayout>
            <Head title={campaign.name} />

            <CampaignHero campaign={{ ...campaign, producers_count: producers.length }} />

            <h2 className="mt-10 font-serif text-2xl">{t('Proizvođači u kampanji')}</h2>
            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                    {t('Proizvođači se upravo prijavljuju.')}{' '}
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
