import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { POST_TYPE_LABELS } from '@/components/marketplace/post-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type PostSummary, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

type OwnPost = PostSummary & { status: 'draft' | 'published' | 'blocked'; created_at: string };

const STATUS_LABELS: Record<OwnPost['status'], string> = {
    draft: tx('Nacrt'),
    published: tx('Objavljeno'),
    blocked: tx('Blokiran'),
};

/** The producer's own stories and recipes. */
export default function PostsIndex({ producer, posts }: { producer: Pick<Producer, 'id' | 'name' | 'slug' | 'status'>; posts: Paginated<OwnPost> }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
        { title: t('Priče i recepti'), href: `/moji-proizvodjaci/${producer.id}/price` },
    ];

    const destroy = async (post: OwnPost) => {
        if (await ask({ title: t('Obrisati „:name”?', { name: post.title }), description: t('Ova radnja se ne može poništiti.'), tone: 'danger' })) {
            router.delete(route('producers.posts.destroy', [producer.id, post.id]));
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Priče i recepti')} — ${producer.name}`} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Priče i recepti')}</h1>
                <Button asChild>
                    <Link href={route('producers.posts.create', producer.id)}>{t('Nova objava')}</Link>
                </Button>
            </div>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                {t(
                    'Ispričajte kako nastaje ono što pravite ili podelite recept. Svaka objava je posebna stranica koju ljudi nalaze na pretraživaču i dele, a vodi do vašeg profila.',
                )}
            </p>

            {producer.status !== 'active' && (
                <p className="text-muted-foreground mt-4 text-sm">{t('Objave će biti vidljive kada proizvođač bude odobren.')}</p>
            )}

            {posts.data.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">{t('Još nemate nijednu objavu.')}</p>
            ) : (
                <ul className="mt-8 max-w-3xl space-y-3">
                    {posts.data.map((post) => (
                        <li key={post.id} className="flex gap-4 rounded-xl border p-4">
                            <div className="bg-muted hidden h-20 w-28 shrink-0 overflow-hidden rounded-md sm:block">
                                {post.cover_image_path && <img src={thumbUrl(post.cover_image_path)} alt="" className="size-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <h2 className="font-serif text-lg break-words">{post.title}</h2>
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-1 text-xs',
                                            post.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
                                        )}
                                    >
                                        {t(STATUS_LABELS[post.status])}
                                    </span>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {t(POST_TYPE_LABELS[post.type])} ·{' '}
                                    {formatDate(post.published_at ?? post.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.posts.edit', [producer.id, post.id])}>{t('Izmeni')}</Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('marketplace.posts.show', post.slug)}>{t('Pogledaj')}</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(post)}>
                                        {t('Obriši')}
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination meta={posts} />
        </MarketplaceLayout>
    );
}
