import { QuickViewContext } from '@/components/marketplace/quick-view-link';
import ProductDetails, { type ProductPageProps } from '@/components/product-page/product-details';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { type ReactNode, useCallback, useRef, useState } from 'react';

/** The page component whose props the popup shows. */
const PRODUCT_PAGE = 'marketplace/products/show';

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
 */
export function QuickViewProvider({ children }: { children: ReactNode }) {
    const { props, version } = usePage<{ quickView?: ProductPageProps }>();
    const shown = props.quickView;
    const [loading, setLoading] = useState(false);
    const request = useRef<AbortController | null>(null);

    const open = useCallback(
        async (href: string) => {
            request.current?.abort();
            const controller = new AbortController();
            request.current = controller;
            setLoading(true);

            try {
                const response = await fetch(href, {
                    signal: controller.signal,
                    headers: {
                        'X-Inertia': 'true',
                        'X-Inertia-Version': version ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'text/html, application/xhtml+xml',
                    },
                });
                const page = response.ok && response.headers.has('X-Inertia') ? await response.json() : null;

                if (page?.component !== PRODUCT_PAGE) {
                    throw new Error('Not a product page');
                }

                router.push({
                    url: page.url,
                    preserveScroll: true,
                    preserveState: true,
                    props: (current) => ({ ...current, quickView: page.props }),
                });
            } catch {
                // Closed before it arrived: nothing to show. Anything else: the page.
                if (!controller.signal.aborted) {
                    router.visit(href);
                }
            } finally {
                if (request.current === controller) {
                    request.current = null;
                    setLoading(false);
                }
            }
        },
        [version],
    );

    const close = () => {
        if (loading) {
            request.current?.abort();
        }

        // Back to the list's own address, and its own history entry.
        if (shown) {
            window.history.back();
        }
    };

    return (
        <QuickViewContext.Provider value={open}>
            {children}

            <Dialog open={Boolean(shown) || loading} onOpenChange={(isOpen) => !isOpen && close()}>
                <DialogContent
                    aria-describedby={undefined}
                    className={cn(
                        'block max-h-[100dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-none p-5 sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-xl sm:p-8',
                        // Full screen on a phone, the way an app opens a post.
                        'top-0 left-0 h-[100dvh] translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:h-auto sm:translate-x-[-50%] sm:translate-y-[-50%]',
                        // There the corner cross scrolls away; "back" stays at the top instead.
                        '[&>button:last-child]:hidden sm:[&>button:last-child]:block',
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

                    {shown && !loading ? (
                        <ProductDetails
                            {...shown}
                            compact
                            title={({ className, children }) => <DialogTitle className={cn(className, 'leading-tight')}>{children}</DialogTitle>}
                        />
                    ) : (
                        <div className="text-muted-foreground grid min-h-64 place-items-center">
                            <DialogTitle className="sr-only">{t('Učitavam proizvod…')}</DialogTitle>
                            <LoaderCircle className="size-6 animate-spin" aria-hidden />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </QuickViewContext.Provider>
    );
}
