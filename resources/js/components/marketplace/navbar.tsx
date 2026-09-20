import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Heart, LogOut, MessageCircle } from 'lucide-react';
import Brand from './brand';
import CartLink from './cart-link';

/**
 * The site's header: shared by every page except the landing page, which
 * keeps its own transparent-over-hero variant, and the admin panel, which
 * has its own shell. Sticky, so navigation and the cart stay reachable no
 * matter how far down the page someone has scrolled.
 */
export default function Navbar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user?.roles?.some((role) => role.name === 'admin') ?? false;

    return (
        <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
                            <Link href={route('messages.index')} aria-label="Poruke" className="text-foreground/80 hover:text-foreground">
                                <MessageCircle className="size-5" />
                            </Link>
                            <Link href="/omiljeni" aria-label="Omiljeni" className="text-foreground/80 hover:text-foreground">
                                <Heart className="size-5" />
                            </Link>
                            <CartLink className="text-foreground/80 hover:text-foreground" />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        {auth.user.name.split(' ')[0]}
                                        <ChevronDown className="size-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem asChild>
                                        <Link href={route('profile.edit')}>Moj nalog</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('orders.mine')}>Moje porudžbine</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('producers.index')}>Moji proizvođači</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('messages.inbox')}>Poruke kupaca</Link>
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                        <DropdownMenuItem asChild>
                                            <Link href={route('admin.dashboard')}>Admin panel</Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('logout')} method="post" as="button" className="w-full">
                                            <LogOut className="size-4" />
                                            Odjava
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
