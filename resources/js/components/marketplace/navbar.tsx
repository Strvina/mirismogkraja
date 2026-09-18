import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Heart, ShoppingCart } from 'lucide-react';
import Brand from './brand';

/**
 * Standard (opaque, non-hero) navbar shared by every marketplace page
 * (task 7.1/7.2) - the landing page keeps its own transparent-over-hero
 * header, which doesn't fit pages without a full-bleed photo.
 */
export default function Navbar() {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="border-border bg-background border-b">
            <div className="mx-auto flex h-auto min-h-20 max-w-[1380px] flex-wrap items-center justify-between gap-y-2 px-5 py-3 sm:px-8 lg:px-12">
                <Brand />
                <nav className="flex items-center gap-6 text-sm font-medium sm:gap-8" aria-label="Glavna navigacija">
                    <Link href="/proizvodjaci" className="transition-opacity hover:opacity-70">
                        Proizvođači
                    </Link>
                    <Link href="/proizvodi" className="transition-opacity hover:opacity-70">
                        Proizvodi
                    </Link>
                </nav>
                <div className="flex items-center gap-3">
                    {auth.user ? (
                        <>
                            <Link href="/omiljeni" aria-label="Omiljeni" className="text-foreground/80 hover:text-foreground">
                                <Heart className="size-5" />
                            </Link>
                            <Link href="/korpa" aria-label="Korpa" className="text-foreground/80 hover:text-foreground">
                                <ShoppingCart className="size-5" />
                            </Link>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/dashboard">Moj nalog</Link>
                            </Button>
                        </>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link href="/login">Prijava</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
