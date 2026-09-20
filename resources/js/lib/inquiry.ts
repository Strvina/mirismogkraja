import { type Order } from '@/types';

/**
 * Inquiry statuses, self-reported by the producer (task 17) - the platform
 * can't verify any of them, which the UI says out loud where it matters.
 */
export const INQUIRY_STATUS_LABELS: Record<Order['status'], string> = {
    pending: 'Na čekanju',
    contacted: 'Proizvođač kontaktirao',
    fulfilled: 'Realizovano',
    cancelled: 'Otkazano',
};

/** What the producer can move an inquiry to next. */
export const NEXT_INQUIRY_STATUSES: Partial<Record<Order['status'], Order['status'][]>> = {
    pending: ['contacted', 'cancelled'],
    contacted: ['fulfilled', 'cancelled'],
};

export const INQUIRY_STATUS_CLASSES: Record<Order['status'], string> = {
    pending: 'bg-muted text-foreground/70',
    contacted: 'bg-olive-soft text-olive',
    fulfilled: 'bg-primary/10 text-primary',
    cancelled: 'bg-destructive/10 text-destructive',
};
