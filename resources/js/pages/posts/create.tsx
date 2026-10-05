import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head } from '@inertiajs/react';
import PostForm from './post-form';

export default function PostsCreate({
    producer,
    products,
    limits,
}: {
    producer: Pick<Producer, 'id' | 'name' | 'slug' | 'status'>;
    products: { id: number; name: string }[];
    limits: { bodyMin: number; bodyMax: number };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: t('Priče i recepti'), href: `/moji-proizvodjaci/${producer.id}/price` },
        { title: t('Nova objava'), href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Nova objava')} — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Nova objava')}</h1>

            <div className="mt-8">
                <PostForm
                    products={products}
                    limits={limits}
                    action={route('producers.posts.store', producer.id)}
                    method="post"
                    submitLabel={t('Sačuvaj')}
                />
            </div>
        </MarketplaceLayout>
    );
}
