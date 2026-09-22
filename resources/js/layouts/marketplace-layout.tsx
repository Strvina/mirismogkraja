import Footer from '@/components/marketplace/footer';
import Navbar from '@/components/marketplace/navbar';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';

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
    return (
        <div className="bg-background paper-grain flex min-h-screen flex-col">
            <Navbar />

            {fullBleed ? (
                <main id="top" className="flex-1">
                    {children}
                </main>
            ) : (
                <main className="mx-auto w-full max-w-[1380px] flex-1 px-5 py-12 sm:px-8 lg:px-12">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav aria-label="Putanja" className="text-muted-foreground mb-6 flex flex-wrap items-center gap-1.5 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={crumb.href} className="flex items-center gap-1.5">
                                {index > 0 && <ChevronRight className="size-3.5 opacity-50" />}
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="text-foreground font-medium">{crumb.title}</span>
                                ) : (
                                    <Link href={crumb.href} className="transition-colors hover:text-foreground">
                                        {crumb.title}
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
