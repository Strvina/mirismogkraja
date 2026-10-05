import { formatDate } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type PostSummary } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, ChefHat } from 'lucide-react';

export const POST_TYPE_LABELS: Record<PostSummary['type'], string> = {
    story: tx('Priča'),
    recipe: tx('Recept'),
};

/** A story or a recipe in a list: photo, what it is, title, how it starts, who wrote it. */
export default function PostCard({ post }: { post: PostSummary }) {
    const Icon = post.type === 'recipe' ? ChefHat : BookOpen;

    return (
        <Link
            href={route('marketplace.posts.show', post.slug)}
            className="group border-border/70 bg-background hover:border-border flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg"
        >
            <div className="bg-muted relative aspect-[16/10] overflow-hidden">
                {post.cover_image_path ? (
                    <img
                        src={thumbUrl(post.cover_image_path)}
                        alt=""
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="text-muted-foreground/50 grid size-full place-items-center">
                        <Icon className="size-10" aria-hidden />
                    </div>
                )}
                <span className="bg-background/90 absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
                    <Icon className="size-3.5" aria-hidden />
                    {t(POST_TYPE_LABELS[post.type])}
                </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h3 className="font-serif text-xl leading-snug break-words">{post.title}</h3>
                {post.excerpt && <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-6">{post.excerpt}</p>}
                <p className="text-muted-foreground mt-auto pt-4 text-xs">
                    {[post.producer?.name, post.published_at && formatDate(post.published_at, { day: 'numeric', month: 'long', year: 'numeric' })]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            </div>
        </Link>
    );
}
