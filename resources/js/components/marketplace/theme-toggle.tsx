import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { t } from '@/lib/i18n';
import { Moon, Sun } from 'lucide-react';

/** Whether the page is dark now: chosen so, or left to a device that is. */
const darkNow = (appearance: string) =>
    appearance === 'dark' ||
    (appearance === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

/**
 * Light or dark, switched with one click in the header of every page. A
 * visitor who never chose follows the device until the first click.
 */
export default function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const dark = darkNow(appearance);

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={t('Tamna tema')}
            aria-pressed={dark}
            onClick={() => updateAppearance(dark ? 'light' : 'dark')}
            className="text-foreground/70 hover:text-foreground"
        >
            {/* What a click gives: the sun at night, the moon by day. */}
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
    );
}
