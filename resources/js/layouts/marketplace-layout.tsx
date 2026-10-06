import Footer from '@/components/marketplace/footer';
import Navbar from '@/components/marketplace/navbar';
import VerifyEmailBanner from '@/components/marketplace/verify-email-banner';
import { t } from '@/lib/i18n';
import { arrivedFromAnotherPage } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/**
 * Shared shell for every page outside the landing page and the admin panel:
 * the same sticky header and footer everywhere, so navigating between the
 * catalog, the inbox and a seller's own pages never swaps out the chrome.
 */
export default function MarketplaceLayout({
    children,
    breadcrumbs,
    fullBleed = false,
}: {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    /** Skips the centered content container, for pages built out of edge-to-edge sections (the landing page). */
    fullBleed?: boolean;
}) {
    // Decided once, when the page appears: a page that was loaded and then
    // filtered must not fade in as a whole on the first filter.
    const [enter] = useState(arrivedFromAnotherPage);

    return (
        <div className="bg-background paper-grain flex min-h-screen flex-col">
            <Navbar />
            <VerifyEmailBanner />

            {fullBleed ? (
                <main id="top" className={cn('flex-1', enter && 'page-enter')}>
                    {children}
                </main>
            ) : (
                <main className={cn('mx-auto w-full max-w-[1380px] flex-1 px-5 py-12 sm:px-8 lg:px-12', enter && 'page-enter')}>
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <nav aria-label={t('Putanja')} className="text-muted-foreground mb-6 flex flex-wrap items-center gap-1.5 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={crumb.href} className="flex items-center gap-1.5">
                                    {index > 0 && <ChevronRight className="size-3.5 opacity-50" />}
                                    {index === breadcrumbs.length - 1 ? (
                                        <span className="text-foreground font-medium">{t(crumb.title)}</span>
                                    ) : (
                                        <Link href={crumb.href} className="hover:text-foreground transition-colors">
                                            {t(crumb.title)}
                                        </Link>
                                    )}
                                </span>
                            ))}
                        </nav>
                    )}

                    {children}
                </main>
            )}

            <Footer />
        </div>
    );
}
