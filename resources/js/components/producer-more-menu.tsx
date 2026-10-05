import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import { type Producer } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarHeart, ChevronDown, MapPin, Megaphone, QrCode, type LucideIcon } from 'lucide-react';

interface Item {
    label: string;
    href: string;
    icon: LucideIcon;
    /** A file the browser downloads, so a plain link rather than a page visit. */
    download?: boolean;
}

/**
 * Everything a producer manages besides the page itself and its products,
 * behind one button - listed out, it would bury the three actions used daily.
 */
export default function ProducerMoreMenu({ producer }: { producer: Pick<Producer, 'id' | 'status'> }) {
    const items: Item[] = [
        { label: t('Gde me nađete'), href: route('producers.markets.index', producer.id), icon: MapPin },
        // The code on the poster opens the public page, which exists once approved.
        ...(producer.status === 'active'
            ? [{ label: t('QR poster za tezgu'), href: route('producers.poster', producer.id), icon: QrCode, download: true }]
            : []),
        { label: t('Isticanje'), href: route('boosts.index'), icon: Megaphone },
        { label: t('Kampanje'), href: route('campaigns.index'), icon: CalendarHeart },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    {t('Više')}
                    <ChevronDown className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
                {items.map((item) => {
                    const content = (
                        <>
                            <item.icon className="text-muted-foreground size-4" />
                            {item.label}
                        </>
                    );

                    return (
                        <DropdownMenuItem key={item.href} asChild>
                            {item.download ? (
                                <a href={item.href} className="cursor-pointer gap-2.5 py-2">
                                    {content}
                                </a>
                            ) : (
                                <Link href={item.href} className="cursor-pointer gap-2.5 py-2">
                                    {content}
                                </Link>
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
