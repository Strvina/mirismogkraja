import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/** The steps of the sign-up wizard, in order. */
export const STEPS = [
    { title: tx('Ko ste'), hint: tx('Naziv pod kojim vas kupci prepoznaju i gde vas mogu naći.') },
    { title: tx('Kako vas dobijaju'), hint: tx('Kontakt i načini na koje roba stiže do kupca.') },
    { title: tx('Kako se predstavljate'), hint: tx('Slike i priča — ovo je ono što kupca zadrži na stranici.') },
    {
        title: tx('Proizvodi'),
        hint: tx('Dodajte nekoliko proizvoda odmah — biće vidljivi kupcima čim odobrimo vaš profil. Nije obavezno; možete i kasnije.'),
    },
];

/** Which step each field is on, so an error sends the producer back to it. */
const FIELD_STEP: Record<string, number> = {
    name: 0,
    city: 0,
    address: 0,
    lat: 0,
    lng: 0,
    phone: 1,
    contact_email: 1,
    delivery_methods: 1,
    cover_image: 2,
    logo: 2,
    description: 2,
    story: 2,
};

/** The first step holding one of these failed fields; the products' own errors are on the last. */
export function firstStepWithError(fields: string[]): number {
    return Math.min(...fields.map((field) => (field.startsWith('products') ? STEPS.length - 1 : (FIELD_STEP[field] ?? 0))));
}

/** Where the producer is in the wizard: done, current, still ahead. */
export function StepIndicator({ step }: { step: number }) {
    return (
        <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label={t('Koraci')}>
            {STEPS.map((item, index) => (
                <li key={item.title} className="flex items-center gap-2">
                    <span
                        aria-current={index === step ? 'step' : undefined}
                        className={cn(
                            'grid size-6 place-items-center rounded-full border text-[0.7rem] font-semibold',
                            index === step && 'border-primary bg-primary text-primary-foreground',
                            index < step && 'border-olive bg-olive-soft text-olive',
                            index > step && 'border-border text-muted-foreground',
                        )}
                    >
                        {index < step ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span className={cn(index === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{t(item.title)}</span>
                    {index < STEPS.length - 1 && <span className="bg-border h-px w-5" aria-hidden />}
                </li>
            ))}
        </ol>
    );
}
