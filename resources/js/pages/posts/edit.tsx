import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, Link } from '@inertiajs/react';
import PostForm, { type EditablePost } from './post-form';

export default function PostsEdit({
    producer,
    post,
    products,
    limits,
}: {
    producer: Pick<Producer, 'id' | 'name' | 'slug' | 'status'>;
    post: EditablePost;
    products: { id: number; name: string }[];
    limits: { bodyMin: number; bodyMax: number };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: t('Priče i recepti'), href: `/moji-proizvodjaci/${producer.id}/price` },
        { title: post.title, href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Izmena')} — ${post.title}`} />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Izmena objave')}</h1>
                {/* The author sees a draft as it will look; everyone else gets a 404. */}
                <Link href={route('marketplace.posts.show', post.slug)} className="text-primary text-sm font-medium underline underline-offset-4">
                    {t('Pogledaj kako izgleda')}
                </Link>
            </div>

            <div className="mt-8">
                <PostForm
                    post={post}
                    products={products}
                    limits={limits}
                    action={route('producers.posts.update', [producer.id, post.id])}
                    method="put"
                    submitLabel={t('Sačuvaj izmene')}
                />
            </div>
        </MarketplaceLayout>
    );
}
