import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import { type Producer } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, CalendarHeart, ChevronDown, CirclePause, Gift, MapPin, Megaphone, QrCode, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

interface Item {
    label: string;
    href: string;
    icon: LucideIcon;
    /** A file the browser downloads, so a plain link rather than a page visit. */
    download?: boolean;
    /** A line under the label, for what is not obvious from it. */
    hint?: string;
}

/**
 * Everything a producer manages besides the page itself and its products,
 * behind one button - listed out, it would bury the three actions used daily.
 */
export default function ProducerMoreMenu({ producer }: { producer: Pick<Producer, 'id' | 'status'> }) {
    const id = useId();
    const items: Item[] = [
        { label: t('Priče i recepti'), href: route('producers.posts.index', producer.id), icon: BookOpen },
        { label: t('Gde me nađete'), href: route('producers.markets.index', producer.id), icon: MapPin },
        { label: t('Brzi odgovori'), href: route('producers.quick-replies.index', producer.id), icon: Zap },
        { label: t('Sertifikati'), href: route('producers.certificates.index', producer.id), icon: ShieldCheck },
        // The code on the poster opens the public page, which exists once approved.
        ...(producer.status === 'active'
            ? [
                  {
                      label: t('QR poster za tezgu'),
                      href: route('producers.poster', producer.id),
                      icon: QrCode,
                      download: true,
                      hint: t(
                          'Odštampajte ga i stavite na tezgu: kupac skenira kod telefonom i otvori vašu stranicu. Skeniranja vidite u statistici.',
                      ),
                  },
              ]
            : []),
        { label: t('Pauza'), href: route('producers.pause.edit', producer.id), icon: CirclePause },
        { label: t('Preporuči proizvođača'), href: route('producers.referrals.index', producer.id), icon: Gift },
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
            <DropdownMenuContent align="start" className="w-72">
                {items.map((item, index) => {
                    // Named by its label alone; the hint is read after it, as a description.
                    const hintId = item.hint ? `${id}-hint-${index}` : undefined;
                    const attributes = {
                        className: 'cursor-pointer gap-2.5 py-2',
                        'aria-label': item.hint ? item.label : undefined,
                        'aria-describedby': hintId,
                    };
                    const content = (
                        <>
                            <item.icon className="text-muted-foreground mt-0.5 size-4 shrink-0 self-start" />
                            <span>
                                {item.label}
                                {item.hint && (
                                    <span id={hintId} className="text-muted-foreground mt-0.5 block text-xs leading-5">
                                        {item.hint}
                                    </span>
                                )}
                            </span>
                        </>
                    );

                    return (
                        <DropdownMenuItem key={item.href} asChild>
                            {item.download ? (
                                <a href={item.href} {...attributes}>
                                    {content}
                                </a>
                            ) : (
                                <Link href={item.href} {...attributes}>
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
