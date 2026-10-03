import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

export type ResponseTimeBucket = 'hour' | 'hours' | 'day' | 'days';

const LABELS: Record<ResponseTimeBucket, string> = {
    hour: tx('Obično odgovara za manje od sat vremena'),
    hours: tx('Obično odgovara u roku od nekoliko sati'),
    day: tx('Obično odgovara u roku od jednog dana'),
    days: tx('Obično odgovara za nekoliko dana'),
};

/** How quickly a producer usually answers (App\Services\ResponseTime); nothing until there is enough to say. */
export default function ResponseTimeBadge({ bucket, className }: { bucket: ResponseTimeBucket | null; className?: string }) {
    if (!bucket) {
        return null;
    }

    return (
        <span className={cn('flex items-center gap-1.5', className)}>
            <Clock className="size-4 shrink-0" aria-hidden />
            {t(LABELS[bucket])}
        </span>
    );
}
