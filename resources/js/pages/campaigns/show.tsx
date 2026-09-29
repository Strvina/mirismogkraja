import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head, Link } from '@inertiajs/react';

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long' });
}

/** A seasonal campaign's page (task 20.3): the theme, and who takes part. */
export default function CampaignShow({ campaign, producers }: { campaign: Campaign; producers: ProducerCardProducer[] }) {
    return (
        <MarketplaceLayout>
            <Head title={campaign.name} />

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">
                Kampanja · {formatDate(campaign.starts_on)} – {formatDate(campaign.ends_on)}
            </p>
            <h1 className="font-serif text-4xl break-words sm:text-5xl">{campaign.name}</h1>
            {campaign.description && <p className="text-muted-foreground mt-4 max-w-2xl leading-7 whitespace-pre-line">{campaign.description}</p>}

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">
                    Proizvođači se upravo prijavljuju.{' '}
                    <Link href={route('marketplace.producers.index')} className="underline">
                        Pogledajte sve proizvođače
                    </Link>
                </p>
            ) : (
                <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {producers.map((producer) => (
                        <ProducerCard key={producer.id} producer={producer} />
                    ))}
                </div>
            )}
        </MarketplaceLayout>
    );
}
