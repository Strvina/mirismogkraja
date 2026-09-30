import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { answer, current, subscribe } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CircleHelp, TriangleAlert } from 'lucide-react';
import { useSyncExternalStore } from 'react';

/**
 * Shows the question asked through ask() (lib/confirm). Mounted once beside
 * the app, so every page gets the same dialog with only its words changed.
 */
export default function ConfirmHost() {
    const question = useSyncExternalStore(subscribe, current, () => null);
    const danger = question?.tone === 'danger';

    return (
        <Dialog open={question !== null} onOpenChange={(open) => !open && answer(false)}>
            {question && (
                <DialogContent className="max-w-sm">
                    <div className="flex gap-4">
                        <span
                            className={cn(
                                'grid size-10 shrink-0 place-items-center rounded-full',
                                danger ? 'bg-destructive/10 text-destructive' : 'bg-olive-soft text-olive',
                            )}
                            aria-hidden
                        >
                            {danger ? <TriangleAlert className="size-5" /> : <CircleHelp className="size-5" />}
                        </span>
                        <div className="min-w-0 space-y-1.5 pt-1">
                            <DialogTitle className="text-base leading-snug">{question.title}</DialogTitle>
                            <DialogDescription className={cn(!question.description && 'sr-only')}>
                                {question.description ?? question.title}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => answer(false)}>
                            {t('Odustani')}
                        </Button>
                        <Button variant={danger ? 'destructive' : 'default'} onClick={() => answer(true)} autoFocus>
                            {question.confirmLabel ?? (danger ? t('Obriši') : t('Potvrdi'))}
                        </Button>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}
