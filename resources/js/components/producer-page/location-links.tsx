import { PointsMap } from '@/components/marketplace/map';
import { t } from '@/lib/i18n';
import { useState } from 'react';
import { type PublicProducer } from './types';

/**
 * Where the producer is, for a producer who marked it. The map opens on
 * request, so Leaflet and its tiles load only for a visitor who asks;
 * directions go to Google Maps, which every phone already has.
 */
export default function LocationLinks({ producer }: { producer: PublicProducer }) {
    const [shown, setShown] = useState(false);

    if (!producer.lat || !producer.lng) {
        return null;
    }

    const point = { id: producer.id, name: producer.name, lat: Number(producer.lat), lng: Number(producer.lng) };

    return (
        <div className="mt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <button type="button" onClick={() => setShown(!shown)} aria-expanded={shown} className="text-primary font-medium underline">
                    {shown ? t('Sakrij mapu') : t('Prikaži na mapi')}
                </button>
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline"
                >
                    {t('Otvori u Google mapama')}
                </a>
            </div>
            {shown && <PointsMap points={[point]} className="mt-3 h-64 max-w-2xl" />}
        </div>
    );
}
