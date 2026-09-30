import Brand from '@/components/marketplace/brand';
import LanguageSwitcher from '@/components/marketplace/language-switcher';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/**
 * Login, registration and the password pages: the site's own wordmark and
 * paper background, the form on a card - compact enough on a phone that
 * the button is on screen without scrolling.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background paper-grain flex min-h-svh flex-col">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
                <Brand />
                <LanguageSwitcher />
            </header>

            <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center sm:px-6 sm:pt-0">
                <div className="border-border/70 bg-card w-full max-w-sm rounded-2xl border p-5 shadow-[0_18px_40px_-28px_color-mix(in_oklab,var(--charcoal)_40%,transparent)] sm:p-7">
                    <div className="mb-6 space-y-1.5 text-center">
                        <h1 className="font-serif text-2xl">{title}</h1>
                        <p className="text-muted-foreground text-sm">{description}</p>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
