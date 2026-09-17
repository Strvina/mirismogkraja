import Footer from '@/components/marketplace/footer';
import Navbar from '@/components/marketplace/navbar';
import { type ReactNode } from 'react';

/**
 * Shared shell for every public marketplace page (household/product list and
 * show pages) - consistent navbar + footer instead of each page rolling its
 * own "← Vrelina juga" back-link (task 7.1/7.2).
 */
export default function MarketplaceLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-background paper-grain min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 lg:px-12">{children}</main>
            <Footer />
        </div>
    );
}
