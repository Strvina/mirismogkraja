import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head, Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

interface FoundingProducer {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    logo_path: string | null;
    founding_number: number;
    founding_joined_at: string | null;
}

/**
 * The founding hundred (task 20.4), in the order they were approved. The
 * number is permanent, so this page is a record rather than a ranking - it
 * does not change when someone's subscription does.
 */
export default function Founding({ producers, claimed, limit }: { producers: FoundingProducer[]; claimed: number; limit: number }) {
    return (
        <MarketplaceLayout>
            <Head title="Prvih 100 proizvođača | Vrelina juga">
                <meta name="description" content="Proizvođači koji su prvi poverovali u domaću proizvodnju na Vrelini juga." />
            </Head>

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">Prvi koji su verovali</p>
            <h1 className="font-serif text-4xl sm:text-5xl">Prvih 100 proizvođača</h1>
            <p className="text-muted-foreground mt-4 max-w-xl leading-7">
                Ljudi koji su izneli svoje proizvode pre nego što ih je iko tražio. Njihov redni broj ostaje uz njih zauvek.
            </p>

            <p className="border-border/70 mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
                <span className="font-serif text-xl">
                    {claimed} / {limit}
                </span>
                <span className="text-muted-foreground">mesta zauzeto</span>
            </p>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">Još nijedno mesto nije zauzeto. Vaše može biti prvo.</p>
            ) : (
                <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {producers.map((producer) => (
                        <li key={producer.id}>
                            <Link
                                href={route('marketplace.producers.show', producer.slug)}
                                className="group border-border/70 hover:border-border flex h-full gap-4 rounded-lg border p-4 transition-shadow hover:shadow-lg"
                            >
                                {producer.logo_path ? (
                                    <img src={`/storage/${producer.logo_path}`} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                                ) : (
                                    <span className="bg-olive-soft text-olive grid size-14 shrink-0 place-items-center rounded-full font-serif text-xl">
                                        {producer.name.charAt(0).toUpperCase()}
                                    </span>
                                )}

                                <div className="min-w-0">
                                    <p className="text-gold font-serif text-sm">#{String(producer.founding_number).padStart(2, '0')}</p>
                                    <p className="font-serif text-lg leading-tight">{producer.name}</p>
                                    {producer.city && (
                                        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                            <MapPin className="size-3.5" />
                                            {producer.city}
                                        </p>
                                    )}
                                    {producer.description && (
                                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">{producer.description}</p>
                                    )}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </MarketplaceLayout>
    );
}
