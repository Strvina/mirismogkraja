import { QuickViewContext, type QuickViewPreview } from '@/components/marketplace/quick-view-link';
import ProductDetails, { type ProductPageProps } from '@/components/product-page/product-details';
import ProductPreview from '@/components/product-page/product-preview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { chat } from '@/lib/chat/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** The page component whose props the popup shows. */
const PRODUCT_PAGE = 'marketplace/products/show';

/** How long a product asked for ahead of a click is good for. */
const FRESH_MS = 30_000;

interface ProductPage {
    component: string;
    url: string;
    props: ProductPageProps;
}

/**
 * Products asked for ahead, by address. Outside the component: the popup
 * is drawn again with each page - closing it with "back" is one - and what
 * the pointer asked for a moment ago is still good.
 */
const asked = new Map<string, { at: number; page: Promise<ProductPage> }>();

/** Forgets what was asked for ahead: for a test, and for nothing else. */
export function forgetAskedProducts(): void {
    asked.clear();
}

/**
 * A product opened from a list shows over the list, the way a post opens
 * on Instagram, instead of leaving it: the filters, the page and the place
 * in it are all still there when it closes.
 *
 * The address changes to the product's own, so it can be copied and sent,
 * "back" closes it, and opening that address - or reloading - shows the
 * product's full page. The popup is given exactly what that page is: the
 * same request, asked for as Inertia asks for a page, so nothing about a
 * product is worked out twice. Anything that goes wrong opens the page.
 *
 * It opens at once: with what the card knew, while the rest comes - and
 * the rest has usually been asked for already, when the pointer came to
 * rest on the card or the finger touched it (QuickViewLink).
 */
export function QuickViewProvider({ children }: { children: ReactNode }) {
    const { props, version } = usePage<{ quickView?: ProductPageProps }>();
    const shown = props.quickView;
    const [pending, setPending] = useState<{ href: string; preview?: QuickViewPreview } | null>(null);
    const latest = useRef(0);

    const fetchPage = useCallback(
        (href: string): Promise<ProductPage> => {
            const key = `${version ?? ''} ${href}`;
            const hit = asked.get(key);

            if (hit && Date.now() - hit.at < FRESH_MS) {
                return hit.page;
            }

            const page = fetch(href, {
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': version ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'text/html, application/xhtml+xml',
                },
            })
                .then(async (response) => {
                    const body = response.ok && response.headers.has('X-Inertia') ? ((await response.json()) as ProductPage) : null;

                    if (body?.component !== PRODUCT_PAGE) {
                        throw new Error('Not a product page');
                    }

                    return body;
                })
                .catch((error: unknown) => {
                    // A failed answer is not kept: the next try asks again.
                    asked.delete(key);
                    throw error;
                });

            asked.set(key, { at: Date.now(), page });

            return page;
        },
        [version],
    );

    const prefetch = useCallback((href: string) => void fetchPage(href).catch(() => undefined), [fetchPage]);

    const open = useCallback(
        async (href: string, preview?: QuickViewPreview) => {
            const ticket = ++latest.current;
            setPending({ href, preview });

            try {
                const page = await fetchPage(href);

                // Closed, or another product opened, while it was on its way.
                if (ticket !== latest.current) {
                    return;
                }

                router.push({
                    url: page.url,
                    preserveScroll: true,
                    preserveState: true,
                    props: (current) => ({ ...current, quickView: page.props }),
                });
            } catch {
                if (ticket === latest.current) {
                    setPending(null);
                    router.visit(href);
                }
            }
        },
        [fetchPage],
    );

    // The product has taken its place: the preview's work is done.
    useEffect(() => {
        if (shown) {
            setPending(null);
        }
    }, [shown]);

    const close = () => {
        latest.current++;
        setPending(null);

        // Back to the list's own address, and its own history entry.
        if (shown) {
            window.history.back();
        }
    };

    const actions = useMemo(() => ({ open, prefetch }), [open, prefetch]);
    const title = ({ className, children }: { className: string; children: ReactNode }) => (
        <DialogTitle className={cn(className, 'leading-tight')}>{children}</DialogTitle>
    );
    // A product opened from inside the popup (a similar one) shows its own preview, not the last product.
    const showPreview = pending !== null && (!shown || !pending.href.endsWith(`/${shown.product.slug}`));

    return (
        <QuickViewContext.Provider value={actions}>
            {children}

            <Dialog open={Boolean(shown) || pending !== null} onOpenChange={(isOpen) => !isOpen && close()}>
                <DialogContent
                    aria-describedby={undefined}
                    className={cn(
                        'block max-h-[100dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-none p-5 sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-xl sm:p-8',
                        // Full screen on a phone, the way an app opens a post.
                        'top-0 left-0 h-[100dvh] translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:h-auto sm:translate-x-[-50%] sm:translate-y-[-50%]',
                        // There the corner cross scrolls away; "back" stays at the top instead.
                        '[&>button:last-child]:hidden sm:[&>button:last-child]:block',
                        // No fade-in to wait through: it is there on the click.
                        'duration-0 sm:duration-150',
                    )}
                >
                    <div className="bg-background/95 sticky -top-5 z-10 -mx-5 -mt-5 mb-4 border-b px-2 py-2 backdrop-blur sm:hidden">
                        <DialogClose asChild>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="size-4" />
                                {t('Nazad')}
                            </Button>
                        </DialogClose>
                    </div>

                    {shown && !showPreview ? (
                        <ProductDetails
                            key={shown.product.id}
                            {...shown}
                            compact
                            title={title}
                            onConversation={(thread) => {
                                close();
                                chat.openThread(thread);
                            }}
                        />
                    ) : (
                        <ProductPreview preview={pending?.preview} title={title} />
                    )}
                </DialogContent>
            </Dialog>
        </QuickViewContext.Provider>
    );
}
