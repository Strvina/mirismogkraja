import InputError from '@/components/input-error';
import { LocationPicker } from '@/components/marketplace/map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { shrinkImage } from '@/lib/shrink-image';
import { cn } from '@/lib/utils';
import { type Category, type Producer } from '@/types';
import { useForm } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import ProducerProductsStep, { type DraftProduct } from './producer-products-step';

type ProducerFormData = {
    name: string;
    description: string;
    story: string;
    address: string;
    city: string;
    phone: string;
    contact_email: string;
    delivery_methods: string[];
    cover_image: File | null;
    logo: File | null;
    /** Empty until a point is chosen on the map; sent as null then. */
    lat: string;
    lng: string;
    /** Only when signing up: the first products, created with the producer. */
    products: DraftProduct[];
};

/** The steps of the sign-up wizard, in order. */
const STEPS = [
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

/** Keys must match Producer::DELIVERY_METHODS. */
const deliveryMethods = {
    licna_dostava: tx('Lična dostava'),
    kurirska_sluzba: tx('Kurirska služba'),
    preuzimanje: tx('Lično preuzimanje'),
};

function ImageField({
    id,
    label,
    preview,
    onChange,
    error,
}: {
    id: string;
    label: string;
    preview: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-4">
                {preview && <img src={preview} alt="" className="size-16 rounded-md object-cover" />}
                <Input
                    id={id}
                    type="file"
                    accept="image/*"
                    className="w-full max-w-xs"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        onChange(file ? await shrinkImage(file) : null);
                    }}
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

/**
 * The producer's own page, as a form.
 *
 * Signing up walks through it in three short steps: who you are,
 * how buyers reach you, and how you present yourself. A single page of
 * fifteen fields is where people give up, and the last step is the one that
 * takes thought - photos and a story - so it comes after the short factual
 * ones rather than guarding them.
 *
 * Editing shows everything at once instead: someone who came to change their
 * phone number should not have to page through a wizard to reach it.
 */
export default function ProducerForm({
    producer,
    action,
    method,
    submitLabel,
    wizard = false,
    categories = [],
}: {
    producer?: Producer;
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
    /** Step through the form instead of showing it all at once. */
    wizard?: boolean;
    /** For the products step of the wizard. */
    categories?: Category[];
}) {
    const { data, setData, post, put, processing, errors } = useForm<ProducerFormData>({
        name: producer?.name ?? '',
        description: producer?.description ?? '',
        story: producer?.story ?? '',
        address: producer?.address ?? '',
        city: producer?.city ?? '',
        phone: producer?.phone ?? '',
        contact_email: producer?.contact_email ?? '',
        delivery_methods: producer?.delivery_methods ?? [],
        cover_image: null,
        logo: null,
        lat: producer?.lat ? String(Number(producer.lat)) : '',
        lng: producer?.lng ? String(Number(producer.lng)) : '',
        products: [],
    });

    const location = data.lat && data.lng ? { lat: Number(data.lat), lng: Number(data.lng) } : null;
    const setLocation = (point: { lat: number; lng: number } | null) =>
        setData((current) => ({ ...current, lat: point ? String(point.lat) : '', lng: point ? String(point.lng) : '' }));

    const [customMethod, setCustomMethod] = useState('');
    const [step, setStep] = useState(0);

    const toggleDeliveryMethod = (key: string, checked: boolean) => {
        setData('delivery_methods', checked ? [...data.delivery_methods, key] : data.delivery_methods.filter((method) => method !== key));
    };

    // Anything that isn't one of the predefined keys is the producer's own wording.
    const customMethods = data.delivery_methods.filter((method) => !(method in deliveryMethods));

    const addCustomMethod = () => {
        const value = customMethod.trim();

        if (value && !data.delivery_methods.includes(value)) {
            setData('delivery_methods', [...data.delivery_methods, value]);
        }

        setCustomMethod('');
    };

    const [coverPreview, setCoverPreview] = useState<string | null>(producer?.cover_image_path ? thumbUrl(producer.cover_image_path) : null);
    const [logoPreview, setLogoPreview] = useState<string | null>(producer?.logo_path ? thumbUrl(producer.logo_path) : null);

    // The name is the only field the server insists on, so it is the only
    // one the wizard refuses to move past.
    const canLeaveFirstStep = data.name.trim() !== '';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // Enter inside a field advances instead of sending a half-filled
        // form, and a submit that arrives before the last step is on screen
        // is not one the producer asked for.
        if (wizard && step < STEPS.length - 1) {
            if (step > 0 || canLeaveFirstStep) {
                setStep(step + 1);
            }

            return;
        }

        const submitFn = method === 'post' ? post : put;
        submitFn(action, {
            forceFormData: true,
            // An error on a field from an earlier step is invisible from the
            // last one, so the wizard goes back to the first step that has one.
            onError: (failed) => {
                if (wizard) {
                    const steps = Object.keys(failed).map((field) => (field.startsWith('products') ? STEPS.length - 1 : (FIELD_STEP[field] ?? 0)));
                    setStep(Math.min(...steps));
                }
            },
        });
    };

    const basics = (
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
                    Kliknite na mapu da označite gde ste — kupci će vas videti na mapi proizvođača. Ne mora biti tačna kućna adresa; dovoljno je selo
                    ili deo grada.
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

    const contact = (
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
                {Object.entries(deliveryMethods).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={data.delivery_methods.includes(key)}
                            onChange={(e) => toggleDeliveryMethod(key, e.target.checked)}
                        />
                        {t(label)}
                    </label>
                ))}

                {customMethods.map((method) => (
                    <span key={method} className="bg-olive-soft text-olive flex w-fit items-center gap-2 rounded-full py-1 pr-2 pl-3 text-sm">
                        {method}
                        <button
                            type="button"
                            aria-label={`Ukloni "${method}"`}
                            onClick={() => toggleDeliveryMethod(method, false)}
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

    const presentation = (
        <>
            <ImageField
                id="cover_image"
                label={t('Naslovna slika')}
                preview={coverPreview}
                error={errors.cover_image}
                onChange={(file) => {
                    setData('cover_image', file);
                    setCoverPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <ImageField
                id="logo"
                label={t('Logo')}
                preview={logoPreview}
                error={errors.logo}
                onChange={(file) => {
                    setData('logo', file);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <div className="grid gap-2">
                <Label htmlFor="description">{t('Opis')}</Label>
                <textarea
                    id="description"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="story">{t('Priča o nastanku proizvoda')}</Label>
                <p className="text-muted-foreground -mt-1 text-xs">{t('Kako nastaje ono što prodajete — tok proizvodnje, tradicija, sezona.')}</p>
                <textarea
                    id="story"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.story}
                    onChange={(e) => setData('story', e.target.value)}
                />
                <InputError message={errors.story} />
            </div>
        </>
    );

    const products = (
        <ProducerProductsStep
            products={data.products}
            categories={categories}
            errors={errors as Record<string, string | undefined>}
            onChange={(next) => setData('products', next)}
        />
    );

    const groups = [basics, contact, presentation, products];

    if (!wizard) {
        return (
            <form onSubmit={submit} className="max-w-xl space-y-6">
                {presentation}
                {basics}
                {contact}
                <Button disabled={processing}>{submitLabel}</Button>
            </form>
        );
    }

    const isLastStep = step === STEPS.length - 1;

    return (
        <form onSubmit={submit} className="max-w-xl space-y-6">
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

            <p className="text-muted-foreground text-sm">{t(STEPS[step].hint)}</p>

            <div className="space-y-6">{groups[step]}</div>

            <div className="flex flex-wrap items-center gap-2">
                {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                        {t('Nazad')}
                    </Button>
                )}

                {/* Distinct keys matter: without them React reuses the same
                    <button> element and only swaps its type, so the click
                    that moved to the last step lands on a submit button that
                    now exists where "Dalje" was - and the browser sends the
                    form before the third step has been filled in at all. */}
                {isLastStep ? (
                    <Button key="submit" type="submit" disabled={processing}>
                        {submitLabel}
                    </Button>
                ) : (
                    <Button key="next" type="button" onClick={() => setStep(step + 1)} disabled={step === 0 && !canLeaveFirstStep}>
                        {t('Dalje')}
                    </Button>
                )}

                <span className="text-muted-foreground text-xs">{t('Korak :current od :total', { current: step + 1, total: STEPS.length })}</span>
            </div>
        </form>
    );
}
