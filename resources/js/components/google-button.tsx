import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * "Nastavi sa Google nalogom", with the divider that sets it apart from the
 * form above it. A plain link, not an Inertia visit: the browser has to
 * leave for Google's own page and come back.
 */
export default function GoogleButton() {
    return (
        <div className="grid gap-4">
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                {t('ili')}
                <span className="bg-border h-px flex-1" />
            </div>
            <Button asChild variant="outline" className="w-full">
                <a href={route('auth.google')}>
                    {/* Google's mark, drawn inline: no request to Google until the button is pressed. */}
                    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
                        <path
                            fill="#34A853"
                            d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
                        />
                        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
                        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
                    </svg>
                    {t('Nastavi sa Google nalogom')}
                </a>
            </Button>
        </div>
    );
}
