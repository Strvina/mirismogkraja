import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { router } from '@inertiajs/react';
import { Heart } from 'lucide-react';

export default function FavoriteButton({ type, id, isFavorited }: { type: 'household' | 'product'; id: number; isFavorited: boolean }) {
    const toggle = () => {
        router.post(route('favorites.toggle'), { favoritable_type: type, favoritable_id: id }, { preserveScroll: true });
    };

    return (
        <Button variant={isFavorited ? 'default' : 'outline'} size="sm" onClick={toggle}>
            <Heart className={isFavorited ? 'fill-current' : ''} />
            {isFavorited ? t('Omiljeno') : type === 'household' ? t('Omiljeni proizvođač') : t('Omiljeni proizvod')}
        </Button>
    );
}
