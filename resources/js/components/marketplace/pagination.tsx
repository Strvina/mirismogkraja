import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginatedMeta {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface Paginated<T> extends PaginatedMeta {
    data: T[];
}

/**
 * Page links for a Laravel paginator (task 10), styled like the rest of the
 * site. Laravel's own labels carry the &laquo;/&raquo; arrows, which we swap
 * for icons and translate.
 */
export default function Pagination({ meta }: { meta: PaginatedMeta }) {
    if (meta.last_page <= 1) {
        return null;
    }

    const pageLinks = meta.links.slice(1, -1);
    const previous = meta.links[0];
    const next = meta.links[meta.links.length - 1];

    return (
        <nav aria-label="Stranice" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
            <PageLink url={previous.url} label="Prethodna" ariaLabel="Prethodna stranica">
                <ChevronLeft className="size-4" />
            </PageLink>

            {pageLinks.map((link, index) => (
                <PageLink key={`${link.label}-${index}`} url={link.url} active={link.active}>
                    {link.label}
                </PageLink>
            ))}

            <PageLink url={next.url} label="Sledeća" ariaLabel="Sledeća stranica">
                <ChevronRight className="size-4" />
            </PageLink>
        </nav>
    );
}

function PageLink({
    url,
    active = false,
    ariaLabel,
    children,
}: {
    url: string | null;
    label?: string;
    active?: boolean;
    ariaLabel?: string;
    children: React.ReactNode;
}) {
    const classes = cn(
        'grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground font-semibold' : 'border-border hover:bg-muted',
        !url && 'pointer-events-none opacity-40',
    );

    if (!url) {
        return (
            <span aria-hidden className={classes}>
                {children}
            </span>
        );
    }

    return (
        <Link href={url} aria-label={ariaLabel} aria-current={active ? 'page' : undefined} className={classes} preserveScroll>
            {children}
        </Link>
    );
}
