import PostCard, { POST_TYPE_LABELS } from '@/components/marketplace/post-card';
import ShareButtons from '@/components/marketplace/share-buttons';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate, formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { type BreadcrumbItem, type PostSummary, type Product } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { EyeOff } from 'lucide-react';

interface Post {
    id: number;
    type: PostSummary['type'];
    title: string;
    slug: string;
    body: string;
    cover_image_path: string | null;
    published_at: string | null;
    status: 'draft' | 'published' | 'blocked';
    /** Recipes only; empty for a story. */
    ingredients: string[];
}

/** One story or recipe: the text, who wrote it, and what it is made with. */
export default function PostShow({
    post,
    producer,
    product,
    more,
    isPreview,
}: {
    post: Post;
    producer: { id: number; name: string; slug: string; city: string | null; logo_path: string | null; description: string | null };
    /** The product the post is about, while it is on sale. */
    product: (Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit'> & { image: string | null }) | null;
    more: PostSummary[];
    /** The author looking at a post nobody else can see yet. */
    isPreview: boolean;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Priče i recepti'), href: '/price' },
        { title: post.title, href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${post.title} — ${producer.name}`} />

            <article className="mx-auto max-w-2xl">
                {isPreview && (
                    <p className="border-border/70 bg-muted/50 mb-6 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
                        <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {t('Ovo vidite samo vi. Objava još nije javna.')}
                    </p>
                )}

                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t(POST_TYPE_LABELS[post.type])}</p>
                <h1 className="mt-2 font-serif text-4xl leading-tight break-words sm:text-5xl">{post.title}</h1>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                    <Link href={route('marketplace.producers.show', producer.slug)} className="flex items-center gap-2 font-medium">
                        {producer.logo_path && <img src={thumbUrl(producer.logo_path)} alt="" className="size-9 rounded-full border object-cover" />}
                        {producer.name}
                    </Link>
                    <span className="text-muted-foreground">
                        {[producer.city, post.published_at && formatDate(post.published_at, { day: 'numeric', month: 'long', year: 'numeric' })]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                </div>

                {post.cover_image_path && (
                    <img
                        src={mediaUrl(post.cover_image_path)}
                        alt={post.title}
                        className="image-warm mt-8 aspect-[16/10] w-full rounded-md object-cover"
                    />
                )}

                {post.ingredients.length > 0 && (
                    <section className="bg-muted/40 mt-8 rounded-lg p-5">
                        <h2 className="font-serif text-2xl">{t('Sastojci')}</h2>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6">
                            {post.ingredients.map((ingredient, index) => (
                                <li key={index} className="break-words">
                                    {ingredient}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {post.ingredients.length > 0 && <h2 className="mt-8 font-serif text-2xl">{t('Priprema')}</h2>}
                {/* Plain text, as written: line breaks kept, no markup run. */}
                <div className="mt-6 text-base leading-8 break-words whitespace-pre-line">{post.body}</div>

                {product && (
                    <Link
                        href={route('marketplace.products.show', product.slug)}
                        className="border-border/70 hover:border-border mt-10 flex items-center gap-4 rounded-lg border p-4 transition-colors"
                    >
                        <div className="bg-muted size-16 shrink-0 overflow-hidden rounded-md">
                            {product.image && <img src={thumbUrl(product.image)} alt="" className="image-warm size-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{post.type === 'recipe' ? t('Pravi se od') : t('Priča je o')}</p>
                            <p className="font-medium break-words">{product.name}</p>
                            <p className="text-muted-foreground text-sm">
                                {formatPrice(product.price)} / {product.unit}
                            </p>
                        </div>
                    </Link>
                )}

                <div className="border-border/70 mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                    <ShareButtons url={route('marketplace.posts.show', post.slug)} title={post.title} />
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('marketplace.producers.show', producer.slug)}>{t('Upoznaj proizvođača')}</Link>
                    </Button>
                </div>
            </article>

            {more.length > 0 && (
                <section className="mt-16">
                    <h2 className="font-serif text-2xl">{t('Još od ovog proizvođača')}</h2>
                    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {more.map((item) => (
                            <PostCard key={item.id} post={item} />
                        ))}
                    </div>
                </section>
            )}
        </MarketplaceLayout>
    );
}
