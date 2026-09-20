import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Heart, Package, Sprout } from 'lucide-react';
import { useState } from 'react';
import AccountMenu from './account-menu';
import Brand from './brand';
import CartLink from './cart-link';
import MenuIcon from './menu-icon';
import MessagesLink from './messages-link';

/**
 * The site's header: shared by every page except the admin panel, which has
 * its own shell. Sticky, so navigation and the cart stay reachable no matter
 * how far down the page someone has scrolled.
 *
 * Below md the inline links and icon row would wrap onto several rows, so
 * they collapse into the account menu instead; the cart keeps its own button
 * there since it's the one thing people reach for mid-browse.
 */
export default function Navbar() {
    const { auth } = usePage<SharedData>().props;
    const [guestMenuOpen, setGuestMenuOpen] = useState(false);

    return (
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
            <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-5 sm:h-20 sm:px-8 lg:px-12">
                <Brand />

                <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Glavna navigacija">
                    <Link href={route('marketplace.producers.index')} className="transition-opacity hover:opacity-70">
                        Proizvođači
                    </Link>
                    <Link href={route('marketplace.products.index')} className="transition-opacity hover:opacity-70">
                        Proizvodi
                    </Link>
                </nav>

                <div className="flex items-center gap-3">
                    {auth.user ? (
                        <>
                            <div className="hidden items-center gap-3 md:flex">
                                <MessagesLink className="text-foreground/80 hover:text-foreground" />
                                <Link
                                    href={route('favorites.index')}
                                    aria-label="Omiljeni"
                                    className="text-foreground/80 hover:text-foreground transition-opacity hover:opacity-70"
                                >
                                    <Heart className="size-5" />
                                </Link>
                            </div>

                            <CartLink className="text-foreground/80 hover:text-foreground" />

                            <AccountMenu user={auth.user} />
                        </>
                    ) : (
                        <>
                            <DropdownMenu open={guestMenuOpen} onOpenChange={setGuestMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="md:hidden" aria-label="Meni">
                                        <MenuIcon open={guestMenuOpen} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={10} className="w-52 p-1.5">
                                    <DropdownMenuItem asChild>
                                        <Link href={route('marketplace.producers.index')} className="cursor-pointer gap-2.5 py-2">
                                            <Sprout className="text-muted-foreground size-4" />
                                            Proizvođači
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('marketplace.products.index')} className="cursor-pointer gap-2.5 py-2">
                                            <Package className="text-muted-foreground size-4" />
                                            Proizvodi
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('register')} className="cursor-pointer py-2">
                                            Registracija
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button asChild variant="outline" size="sm">
                                <Link href={route('login')}>Prijava</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
