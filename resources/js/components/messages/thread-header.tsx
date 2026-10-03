import ReportButton from '@/components/marketplace/report-button';
import { Button } from '@/components/ui/button';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { Link, router } from '@inertiajs/react';

/**
 * Who the conversation is with, and either side's defence against the
 * other: close the conversation, or report them to us. Only the side that
 * closed a conversation can open it again.
 */
export default function ThreadHeader({
    title,
    avatar,
    producer,
    buyerId,
    isOwner,
    blocked,
    blockedByMe,
    reportReasons,
}: {
    title: string;
    avatar: string | null;
    producer: { id: number; slug: string };
    buyerId: number;
    isOwner: boolean;
    blocked: boolean;
    blockedByMe: boolean;
    reportReasons: Record<string, string>;
}) {
    const toggleBlock = async () => {
        if (
            blocked ||
            (await ask({
                title: t('Blokirati razgovor sa korisnikom :name?', { name: title }),
                description: t('Nijedno od vas neće moći da šalje poruke dok ga ne odblokirate. Prepiska ostaje sačuvana.'),
                confirmLabel: t('Blokiraj'),
                tone: 'danger',
            }))
        ) {
            router.patch(route('messages.block', [producer.id, buyerId]), {}, { preserveScroll: true });
        }
    };

    return (
        <header className="border-border/70 flex items-center gap-3 border-b px-4 py-3">
            {avatar ? (
                <img src={thumbUrl(avatar)} alt="" className="size-10 shrink-0 rounded-full object-cover" />
            ) : (
                <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full font-semibold">
                    {title.charAt(0).toUpperCase()}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h1 className="truncate font-serif text-lg leading-tight">{title}</h1>
                {!isOwner && (
                    <Link
                        href={route('marketplace.producers.show', producer.slug)}
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                        {t('Otvori profil proizvođača')}
                    </Link>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
                {(!blocked || blockedByMe) && (
                    <Button variant="ghost" size="sm" onClick={toggleBlock}>
                        {blocked ? t('Odblokiraj') : t('Blokiraj')}
                    </Button>
                )}
                {isOwner ? (
                    <ReportButton type="user" id={buyerId} reasons={reportReasons} />
                ) : (
                    <ReportButton type="producer" id={producer.id} reasons={reportReasons} />
                )}
            </div>
        </header>
    );
}
