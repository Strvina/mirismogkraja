import { cn } from '@/lib/utils';
import { Check, Link2, MessageCircle, Send, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Share links (task 21).
 *
 * Plain anchors to each network's own share address, with no third-party
 * script: an embedded share widget would load tracking code on every page
 * for a button most visitors never press. Viber and WhatsApp come first
 * because that is how a link to a jar of honey actually travels here.
 */
export default function ShareButtons({ url, title, className }: { url: string; title: string; className?: string }) {
    const [copied, setCopied] = useState(false);

    const text = encodeURIComponent(`${title} — ${url}`);
    const encodedUrl = encodeURIComponent(url);

    const targets = [
        { href: `viber://forward?text=${text}`, label: 'Viber', icon: Send },
        { href: `https://wa.me/?text=${text}`, label: 'WhatsApp', icon: MessageCircle },
        { href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, label: 'Facebook', icon: Share2 },
    ];

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard access can be refused - a browser in a private
            // window, or a page not served over https. The other buttons
            // still work, so this quietly does nothing.
        }
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="text-muted-foreground text-xs">Podeli:</span>

            {targets.map((target) => (
                <a
                    key={target.label}
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Podeli na ${target.label}`}
                    className="border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted grid size-8 place-items-center rounded-full border transition-colors"
                >
                    <target.icon className="size-4" />
                </a>
            ))}

            <button
                type="button"
                onClick={copy}
                aria-label="Kopiraj link"
                className="border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted grid size-8 place-items-center rounded-full border transition-colors"
            >
                {copied ? <Check className="text-olive size-4" /> : <Link2 className="size-4" />}
            </button>

            {copied && <span className="text-muted-foreground text-xs">Link je kopiran</span>}
        </div>
    );
}
