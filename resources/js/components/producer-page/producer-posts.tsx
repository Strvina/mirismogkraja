import PostCard from '@/components/marketplace/post-card';
import { t } from '@/lib/i18n';
import { type PostSummary } from '@/types';
import { Link } from '@inertiajs/react';

/** The producer's latest stories and recipes, and a link to the rest. */
export default function ProducerPosts({ posts, producerSlug }: { posts: PostSummary[]; producerSlug: string }) {
    if (posts.length === 0) {
        return null;
    }

    return (
        <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl">{t('Priče i recepti')}</h2>
                <Link
                    href={route('marketplace.posts.index', { proizvodjac: producerSlug })}
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                >
                    {t('Sve priče ovog proizvođača')}
                </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        </section>
    );
}
