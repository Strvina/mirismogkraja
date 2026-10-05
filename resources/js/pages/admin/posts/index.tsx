import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { POST_TYPE_LABELS } from '@/components/marketplace/post-card';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type PostSummary } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { EyeOff, RotateCcw } from 'lucide-react';

type Status = 'draft' | 'published' | 'blocked';

type AdminPost = Omit<PostSummary, 'producer' | 'cover_image_path'> & {
    status: Status;
    created_at: string;
    producer: { id: number; name: string; slug: string } | null;
};

const TABS: { status: Status | null; label: string }[] = [
    { status: null, label: tx('Sve') },
    { status: 'published', label: tx('Objavljeno') },
    { status: 'blocked', label: tx('Blokirano') },
    { status: 'draft', label: tx('Nacrti') },
];

const STATUS_LABELS: Record<Status, string> = {
    draft: tx('Nacrt'),
    published: tx('Objavljeno'),
    blocked: tx('Blokirano'),
};

/**
 * Stories and recipes go up without waiting; this is where they are read
 * afterwards. A blocked post stays with its author, who can correct it,
 * but only an admin puts it back.
 */
export default function AdminPostsIndex({ posts, filters }: { posts: Paginated<AdminPost>; filters: { status: Status | null; q: string | null } }) {
    const setStatus = (post: AdminPost, status: Status) => router.patch(route('admin.posts.status', post.id), { status }, { preserveScroll: true });

    const destroy = async (post: AdminPost) => {
        if (
            await ask({
                title: t('Trajno obrisati „:name”?', { name: post.title }),
                description: t('Ova radnja se ne može poništiti.'),
                tone: 'danger',
            })
        ) {
            router.delete(route('admin.posts.destroy', post.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Priče i recepti')}>
            <Head title={t('Priče i recepti')} />

            <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex flex-wrap gap-1">
                    {TABS.map((tab) => (
                        <Link
                            key={tab.label}
                            href={route('admin.posts.index', {
                                ...(tab.status ? { status: tab.status } : {}),
                                ...(filters.q ? { q: filters.q } : {}),
                            })}
                            preserveScroll
                            className={cn(
                                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {t(tab.label)}
                        </Link>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const q = new FormData(e.currentTarget).get('q');
                        router.get(route('admin.posts.index'), {
                            ...(filters.status ? { status: filters.status } : {}),
                            ...(q ? { q: String(q) } : {}),
                        });
                    }}
                >
                    <input
                        name="q"
                        defaultValue={filters.q ?? ''}
                        placeholder={t('Traži po naslovu')}
                        aria-label={t('Traži po naslovu')}
                        className="border-input bg-background w-56 rounded-md border px-3 py-2 text-sm"
                    />
                </form>
            </div>

            {posts.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">{t('Ovde još nema ničega.')}</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {posts.data.map((post) => (
                        <div key={post.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-medium break-words">
                                    {post.producer === null ? (
                                        post.title
                                    ) : (
                                        <a
                                            href={route('marketplace.posts.show', post.slug)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-2"
                                        >
                                            {post.title}
                                        </a>
                                    )}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {t(POST_TYPE_LABELS[post.type])} · {post.producer?.name ?? '—'} ·{' '}
                                    {formatRelativeTime(post.published_at ?? post.created_at)} ·{' '}
                                    <span className={post.status === 'blocked' ? 'text-destructive font-medium' : undefined}>
                                        {t(STATUS_LABELS[post.status])}
                                    </span>
                                </p>
                                {post.excerpt && <p className="text-muted-foreground mt-2 break-words">{post.excerpt}</p>}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                {post.status === 'published' && (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(post, 'blocked')}>
                                        <EyeOff className="size-4" />
                                        {t('Skloni')}
                                    </Button>
                                )}
                                {post.status === 'blocked' && (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(post, 'published')}>
                                        <RotateCcw className="size-4" />
                                        {t('Vrati')}
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => destroy(post)}>
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={posts} />
        </AdminLayout>
    );
}
