import Head from '@/components/head';
import CardGrid from '@/components/marketplace/card-grid';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import PostCard from '@/components/marketplace/post-card';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type PostSummary } from '@/types';
import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';

const TABS: { vrsta: string | null; label: string }[] = [
    { vrsta: null, label: tx('Sve') },
    { vrsta: 'prica', label: tx('Priče') },
    { vrsta: 'recept', label: tx('Recepti') },
];

/** Every published story and recipe, newest first. */
export default function PostsIndex({
    posts,
    filters,
}: {
    posts: Paginated<PostSummary>;
    filters: { vrsta: string | null; producer: { name: string; slug: string } | null };
}) {
    // A tab keeps the producer filter; clearing the producer keeps the tab.
    const address = (vrsta: string | null, producer = filters.producer?.slug) =>
        route('marketplace.posts.index', { ...(vrsta ? { vrsta } : {}), ...(producer ? { proizvodjac: producer } : {}) });

    return (
        <MarketplaceLayout>
            <Head title={t('Priče i recepti')} />

            <h1 className="mt-6 font-serif text-4xl sm:text-5xl">{t('Priče i recepti')}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                {t('Kako nastaju domaći proizvodi sa juga Srbije i šta se od njih sprema — iz prve ruke, od ljudi koji ih prave.')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
                <nav aria-label={t('Vrsta')} className="flex flex-wrap gap-1">
                    {TABS.map((tab) => (
                        <Link
                            key={tab.label}
                            href={address(tab.vrsta)}
                            aria-current={filters.vrsta === tab.vrsta ? 'page' : undefined}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                filters.vrsta === tab.vrsta ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {t(tab.label)}
                        </Link>
                    ))}
                </nav>

                {filters.producer && (
                    <Link
                        href={address(filters.vrsta, '')}
                        className="border-border/70 hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors"
                    >
                        {filters.producer.name}
                        <X className="size-3.5" aria-label={t('Ukloni filter')} />
                    </Link>
                )}
            </div>

            {posts.data.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">{t('Ovde još nema ničega. Navratite uskoro.')}</p>
            ) : (
                <CardGrid className="mt-8 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.data.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </CardGrid>
            )}

            <Pagination meta={posts} />
        </MarketplaceLayout>
    );
}
