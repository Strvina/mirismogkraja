import heroImage from '@/assets/hero-ajvar.jpg';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarHeart, Users } from 'lucide-react';
import { type ReactNode } from 'react';

export interface CampaignSummary {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
    producers_count?: number;
}

/** "12. oktobar" / "12 October" / "12 октября". */
function longDay(date: string): string {
    return formatDate(date, { day: 'numeric', month: 'long' });
}

function daysLeft(endsOn: string): number {
    const today = new Date(new Date().toDateString()).getTime();

    return Math.max(0, Math.round((new Date(endsOn).getTime() - today) / 86_400_000));
}

function timeLeft(endsOn: string): string {
    const left = daysLeft(endsOn);

    return left === 0 ? t('Poslednji dan') : left === 1 ? t('Traje još 1 dan') : t('Traje još :count dana', { count: left });
}

function Eyebrow({ campaign, className }: { campaign: CampaignSummary; className?: string }) {
    return (
        <p className={cn('flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase', className)}>
            <CalendarHeart className="size-4" aria-hidden />
            {t('Sezonska kampanja')} · {longDay(campaign.starts_on)} – {longDay(campaign.ends_on)}
        </p>
    );
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', className)}>{children}</span>;
}

/**
 * A running campaign on the home page: a card with the season's photograph,
 * not a coloured band - it should read as an invitation, not an alarm.
 */
export function CampaignCard({ campaign, wide = false }: { campaign: CampaignSummary; wide?: boolean }) {
    return (
        <Link
            href={route('campaigns.show', campaign.slug)}
            className={cn(
                'group border-border/70 bg-card grid overflow-hidden rounded-2xl border transition-shadow hover:shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--charcoal)_45%,transparent)]',
                wide && 'md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]',
            )}
        >
            <div className={cn('relative min-h-48 overflow-hidden', wide && 'md:min-h-64')}>
                <img
                    src={heroImage}
                    alt=""
                    loading="lazy"
                    className="image-warm absolute inset-0 size-full object-cover object-[70%_60%] transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_55%,transparent),transparent_60%)]" />
                <Chip className="bg-background/90 text-foreground absolute bottom-4 left-4">
                    <span className="bg-gold size-1.5 rounded-full" aria-hidden />
                    {timeLeft(campaign.ends_on)}
                </Chip>
            </div>

            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <Eyebrow campaign={campaign} className="text-olive" />
                <h3 className="font-serif text-3xl leading-tight break-words">{campaign.name}</h3>
                {campaign.description && <p className="text-muted-foreground line-clamp-2 leading-7">{campaign.description}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
                    {campaign.producers_count !== undefined && campaign.producers_count > 0 ? (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="size-4" aria-hidden />
                            {t('Učestvuje proizvođača: :count', { count: campaign.producers_count })}
                        </span>
                    ) : (
                        <span />
                    )}
                    <span className="text-primary flex items-center gap-1.5 font-semibold group-hover:underline">
                        {t('Pogledaj proizvođače')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

/** The top of a campaign's own page: the season's photograph under the title. */
export function CampaignHero({ campaign }: { campaign: CampaignSummary }) {
    return (
        <section className="bg-charcoal relative isolate overflow-hidden rounded-2xl text-white">
            <img src={heroImage} alt="" className="image-warm absolute inset-0 -z-10 size-full object-cover object-[70%_60%] opacity-70" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--charcoal)_92%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_70%,transparent)_55%,transparent_100%)]" />

            <div className="max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
                <Eyebrow campaign={campaign} className="text-gold" />
                <h1 className="mt-4 font-serif text-4xl leading-tight break-words sm:text-6xl">{campaign.name}</h1>
                {campaign.description && <p className="mt-4 leading-7 whitespace-pre-line text-white/85">{campaign.description}</p>}
                <div className="mt-7 flex flex-wrap gap-2">
                    <Chip className="bg-white/15 backdrop-blur-sm">
                        <span className="bg-gold size-1.5 rounded-full" aria-hidden />
                        {timeLeft(campaign.ends_on)}
                    </Chip>
                    {campaign.producers_count !== undefined && campaign.producers_count > 0 && (
                        <Chip className="bg-white/15 backdrop-blur-sm">
                            <Users className="size-3.5" aria-hidden />
                            {t('Učestvuje proizvođača: :count', { count: campaign.producers_count })}
                        </Chip>
                    )}
                </div>
            </div>
        </section>
    );
}
