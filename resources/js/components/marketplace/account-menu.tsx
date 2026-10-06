import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type SharedData, type User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpen,
    CalendarHeart,
    ChevronDown,
    Heart,
    LayoutDashboard,
    LogOut,
    Megaphone,
    MessageCircle,
    Package,
    Search,
    Sprout,
    UserRound,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import MenuIcon from './menu-icon';

interface MenuLink {
    href: string;
    label: string;
    icon: typeof UserRound;
    badge?: number;
    mobileOnly?: boolean;
}

/**
 * The header's account menu. On phones it doubles as the site menu, since
 * the inline nav collapses into it - hence the browse links marked
 * mobileOnly.
 */
export default function AccountMenu({ user }: { user: User }) {
    const { unreadMessages, unreadNotifications } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);

    const isAdmin = user.roles?.some((role) => role.name === 'admin') ?? false;
    const isSeller = user.roles?.some((role) => role.name === 'seller') ?? false;

    const browseLinks: MenuLink[] = [
        { href: route('marketplace.producers.index'), label: t('Proizvođači'), icon: Sprout, mobileOnly: true },
        { href: route('marketplace.products.index'), label: t('Proizvodi'), icon: Package, mobileOnly: true },
        { href: route('marketplace.posts.index'), label: t('Priče i recepti'), icon: BookOpen, mobileOnly: true },
        { href: route('wanted.index'), label: t('Tražim'), icon: Search, mobileOnly: true },
    ];

    const accountLinks: MenuLink[] = [
        { href: route('messages.index'), label: t('Poruke'), icon: MessageCircle, badge: unreadMessages },
        { href: route('notifications.index'), label: t('Obaveštenja'), icon: Bell, badge: unreadNotifications },
        { href: route('favorites.index'), label: t('Omiljeni'), icon: Heart },
        { href: route('producers.index'), label: t('Moji proizvođači'), icon: Sprout },
        // What a seller pays for; a buyer without a producer has nothing
        // to see on these pages, so they are not offered.
        ...(isSeller
            ? [
                  { href: route('memberships.index'), label: t('Članarina'), icon: Wallet },
                  { href: route('boosts.index'), label: t('Isticanje'), icon: Megaphone },
                  { href: route('campaigns.index'), label: t('Kampanje'), icon: CalendarHeart },
              ]
            : []),
        { href: route('profile.edit'), label: t('Moj nalog'), icon: UserRound },
    ];

    if (isAdmin) {
        accountLinks.push({ href: route('admin.dashboard'), label: t('Admin panel'), icon: LayoutDashboard });
    }

    const renderLink = (link: MenuLink) => (
        <DropdownMenuItem key={link.href} asChild className={link.mobileOnly ? 'lg:hidden' : undefined}>
            <Link href={link.href} className="cursor-pointer justify-between gap-3 py-2">
                <span className="flex items-center gap-2.5">
                    <link.icon className="text-muted-foreground size-4" />
                    {link.label}
                </span>
                {Boolean(link.badge) && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                        {link.badge! > 99 ? '99+' : link.badge}
                    </span>
                )}
            </Link>
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <span className="lg:hidden">
                        <MenuIcon open={open} />
                    </span>
                    <span className="hidden max-w-24 truncate lg:inline">{user.name.split(' ')[0]}</span>
                    <ChevronDown className={`hidden size-3.5 transition-transform duration-300 lg:inline ${open ? 'rotate-180' : ''}`} />
                    {unreadMessages + unreadNotifications > 0 && <span className="bg-primary size-1.5 rounded-full lg:hidden" aria-hidden />}
                    <span className="sr-only">{t('Meni')}</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={10} className="w-60 p-1.5">
                <div className="flex items-center gap-3 px-2 py-2.5">
                    {user.avatar_path ? (
                        <img src={thumbUrl(user.avatar_path)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                        <span className="bg-olive-soft text-olive grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    </div>
                </div>

                <DropdownMenuSeparator />

                <div className="lg:hidden">
                    {browseLinks.map(renderLink)}
                    <DropdownMenuSeparator />
                </div>

                {accountLinks.map(renderLink)}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href={route('logout')} method="post" as="button" className="text-destructive w-full cursor-pointer gap-2.5 py-2">
                        <LogOut className="size-4" />
                        {t('Odjava')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
