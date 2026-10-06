import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { currentLocale, LOCALES, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Check, Globe } from 'lucide-react';

/**
 * The language menu. Each choice is a plain link: the server remembers it
 * and sends the page back in the new language, which needs a full load to
 * bring that language's words anyway.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
    const locale = currentLocale();
    const short = LOCALES.find((item) => item.code === locale)?.short;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                // Says what the button shows as well as what it is for, so
                // someone using voice control can name it by what they see.
                aria-label={`${t('Jezik')}: ${short}`}
                className={cn(
                    'text-foreground/70 hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold tracking-wide transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
                    className,
                )}
            >
                <Globe className="size-4" aria-hidden />
                {short}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
                {LOCALES.map((item) => (
                    <DropdownMenuItem key={item.code} asChild>
                        <a href={route('locale', item.code)} lang={item.code} className="flex cursor-pointer items-center justify-between gap-3">
                            {item.label}
                            {item.code === locale && <Check className="size-4" aria-hidden />}
                        </a>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
