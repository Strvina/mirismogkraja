import { t } from '@/lib/i18n';
import { scrollBackToStart } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

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

const PAGE_LINKS = '[data-page-links]';

/**
 * Page links for a Laravel paginator, styled like the rest of the
 * site. Laravel's own labels carry the &laquo;/&raquo; arrows, which we swap
 * for icons and translate.
 */
export default function Pagination({ meta }: { meta: PaginatedMeta }) {
    const nav = useRef<HTMLElement>(null);
    // Which set of page links on the page this one is: a page can hold two lists.
    const which = useRef(-1);

    if (meta.last_page <= 1) {
        return null;
    }

    const pageLinks = meta.links.slice(1, -1);
    const previous = meta.links[0];
    const next = meta.links[meta.links.length - 1];

    // The page stays where it is when the list changes - a producer's page
    // has reviews to page through halfway down it - so the reader, who is
    // at the foot of the list, is taken back to its top: what holds the
    // list and these links. Left there, they see the same foot of a
    // different page and nothing to say it changed.
    //
    // The visit draws the page afresh, these links with it, so the list is
    // found again by its place among the page's sets of page links.
    const motion = {
        onStart: () => {
            which.current = nav.current ? Array.from(document.querySelectorAll(PAGE_LINKS)).indexOf(nav.current) : -1;
        },
        // Two frames on: once the other page's cards are laid out. Started
        // sooner, the glide is cut short when a shorter list shrinks the page.
        onSuccess: () =>
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    const list = document.querySelectorAll(PAGE_LINKS)[which.current]?.parentElement;

                    if (list) {
                        scrollBackToStart(list);
                    }
                }),
            ),
    };

    return (
        <nav ref={nav} data-page-links aria-label={t('Stranice')} className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
            <PageLink url={previous.url} label={t('Prethodna')} ariaLabel={t('Prethodna stranica')} motion={motion}>
                <ChevronLeft className="size-4" />
            </PageLink>

            {pageLinks.map((link, index) => (
                <PageLink key={`${link.label}-${index}`} url={link.url} active={link.active} motion={motion}>
                    {link.label}
                </PageLink>
            ))}

            <PageLink url={next.url} label={t('Sledeća')} ariaLabel={t('Sledeća stranica')} motion={motion}>
                <ChevronRight className="size-4" />
            </PageLink>
        </nav>
    );
}

function PageLink({
    url,
    active = false,
    ariaLabel,
    motion,
    children,
}: {
    url: string | null;
    label?: string;
    active?: boolean;
    ariaLabel?: string;
    /** What the visit to the other page does before it leaves and once it has arrived. */
    motion: { onStart: () => void; onSuccess: () => void };
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
        <Link href={url} aria-label={ariaLabel} aria-current={active ? 'page' : undefined} className={classes} preserveScroll {...motion}>
            {children}
        </Link>
    );
}
