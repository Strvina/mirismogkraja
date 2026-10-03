import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t, tx } from '@/lib/i18n';
import { X } from 'lucide-react';
import { useState } from 'react';
import { type ProducerFormFields } from './types';

/** Keys must match Producer::DELIVERY_METHODS. */
const DELIVERY_METHODS = {
    licna_dostava: tx('Lična dostava'),
    kurirska_sluzba: tx('Kurirska služba'),
    preuzimanje: tx('Lično preuzimanje'),
};

/**
 * How buyers reach the producer: phone, e-mail, and the ways goods get to
 * them - the usual ones as checkboxes, plus the producer's own wording.
 */
export default function ContactFields({ data, setData, errors }: ProducerFormFields) {
    const [customMethod, setCustomMethod] = useState('');

    const toggle = (key: string, checked: boolean) =>
        setData('delivery_methods', checked ? [...data.delivery_methods, key] : data.delivery_methods.filter((method) => method !== key));

    // Anything that isn't one of the predefined keys is the producer's own wording.
    const customMethods = data.delivery_methods.filter((method) => !(method in DELIVERY_METHODS));

    const addCustomMethod = () => {
        const value = customMethod.trim();

        if (value && !data.delivery_methods.includes(value)) {
            setData('delivery_methods', [...data.delivery_methods, value]);
        }

        setCustomMethod('');
    };

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor="phone">{t('Telefon za kontakt')}</Label>
                <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder={t('+381 6x xxx xxxx')} />
                <InputError message={errors.phone} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="contact_email">{t('Email za kontakt')}</Label>
                <Input id="contact_email" type="email" value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} />
                <InputError message={errors.contact_email} />
            </div>

            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">{t('Način dostave')}</legend>
                <p className="text-muted-foreground -mt-1 mb-1 text-xs">{t('Izaberite sve načine na koje kupci mogu da preuzmu robu.')}</p>
                {Object.entries(DELIVERY_METHODS).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={data.delivery_methods.includes(key)}
                            onChange={(e) => toggle(key, e.target.checked)}
                        />
                        {t(label)}
                    </label>
                ))}

                {customMethods.map((method) => (
                    <span key={method} className="bg-olive-soft text-olive flex w-fit items-center gap-2 rounded-full py-1 pr-2 pl-3 text-sm">
                        {method}
                        <button
                            type="button"
                            aria-label={t('Ukloni „:method”', { method })}
                            onClick={() => toggle(method, false)}
                            className="hover:bg-olive/15 grid size-5 place-items-center rounded-full transition-colors"
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}

                <div className="mt-1 flex max-w-sm gap-2">
                    <Input
                        value={customMethod}
                        onChange={(e) => setCustomMethod(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomMethod();
                            }
                        }}
                        placeholder={t('Npr. dostava autobusom')}
                        maxLength={60}
                        aria-label={t('Svoj način dostave')}
                    />
                    <Button type="button" variant="outline" onClick={addCustomMethod} disabled={!customMethod.trim()}>
                        {t('Dodaj')}
                    </Button>
                </div>

                <InputError message={errors.delivery_methods} />
            </fieldset>
        </>
    );
}
