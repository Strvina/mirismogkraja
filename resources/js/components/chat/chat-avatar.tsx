import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

/** A person or a producer, by their picture or, without one, their initial. */
export function Avatar({ path, name, className }: { path: string | null; name: string; className?: string }) {
    return path ? (
        <img src={thumbUrl(path)} alt="" className={cn('size-9 shrink-0 rounded-full object-cover', className)} />
    ) : (
        <span className={cn('bg-olive-soft text-olive grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold', className)}>
            {name.charAt(0).toUpperCase()}
        </span>
    );
}
