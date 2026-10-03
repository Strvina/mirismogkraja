import InputError from '@/components/input-error';
import { LocationPicker } from '@/components/marketplace/map';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';
import { type ProducerFormFields } from './types';

/** Who the producer is and where: name, town, address and a pin on the map. */
export default function BasicsFields({ data, setData, errors }: ProducerFormFields) {
    const location = data.lat && data.lng ? { lat: Number(data.lat), lng: Number(data.lng) } : null;
    const setLocation = (point: { lat: number; lng: number } | null) =>
        setData((current) => ({ ...current, lat: point ? String(point.lat) : '', lng: point ? String(point.lng) : '' }));

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor="name">{t('Naziv proizvođača')}</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="city">{t('Grad')}</Label>
                <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                <InputError message={errors.city} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">{t('Adresa')}</Label>
                <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <p className="text-sm font-medium">{t('Lokacija na mapi (opciono)')}</p>
                <p className="text-muted-foreground text-xs">
                    {t(
                        'Kliknite na mapu da označite gde ste — kupci će vas videti na mapi proizvođača. Ne mora biti tačna kućna adresa; dovoljno je selo ili deo grada.',
                    )}
                </p>
                <LocationPicker value={location} onChange={setLocation} />
                {location && (
                    <button type="button" onClick={() => setLocation(null)} className="text-muted-foreground w-fit text-xs underline">
                        {t('Ukloni lokaciju')}
                    </button>
                )}
                <InputError message={errors.lat ?? errors.lng} />
            </div>
        </>
    );
}
