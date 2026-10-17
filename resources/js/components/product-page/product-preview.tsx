import { type QuickViewPreview } from '@/components/marketplace/quick-view-link';
import { formatPrice } from '@/lib/format';
import { thumbUrl } from '@/lib/media';
import { type ReactNode } from 'react';

/**
 * The product as its card already showed it - photo, name, price, producer
 * - laid out where the full popup puts them, for the moment until the rest
 * arrives. The rest is drawn as quiet blocks in its place, so nothing jumps
 * when it comes and there is no spinner to watch.
 */
export default function ProductPreview({
    preview,
    title,
}: {
    preview?: QuickViewPreview;
    title: (props: { className: string; children: ReactNode }) => ReactNode;
}) {
    const Title = title;

    return (
        <div className="grid gap-10 md:grid-cols-2 md:gap-8" aria-busy>
            <div className="bg-muted aspect-square overflow-hidden rounded-md">
                {preview?.image && <img src={thumbUrl(preview.image)} alt="" className="image-warm size-full object-cover" />}
            </div>

            <div>
                <div className="bg-muted h-3 w-24 rounded-full" />
                <Title className="mt-2 font-serif text-3xl font-normal break-words sm:text-4xl">{preview?.name ?? ''}</Title>
                {preview?.price ? (
                    <p className="mt-3 font-serif text-2xl">
                        {formatPrice(preview.price)}{' '}
                        {preview.unit && <span className="text-muted-foreground font-sans text-sm">/ {preview.unit}</span>}
                    </p>
                ) : (
                    <div className="bg-muted mt-4 h-7 w-36 rounded-md" />
                )}

                <div className="mt-6 space-y-2.5">
                    <div className="bg-muted h-3.5 w-full rounded-full" />
                    <div className="bg-muted h-3.5 w-11/12 rounded-full" />
                    <div className="bg-muted h-3.5 w-3/4 rounded-full" />
                </div>
                <div className="bg-muted mt-6 h-24 w-full rounded-md" />
                <div className="bg-muted mt-3 h-10 w-40 rounded-md" />

                <div className="mt-8 flex items-center gap-3 rounded-md border p-4">
                    <div className="bg-muted size-10 shrink-0 rounded-full" />
                    <div className="min-w-0">
                        <p className="font-serif break-words">{preview?.producer?.name}</p>
                        {preview?.producer?.city && <p className="text-muted-foreground text-xs">{preview.producer.city}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
