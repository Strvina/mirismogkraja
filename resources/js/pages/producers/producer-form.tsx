import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type Producer } from '@/types';
import { useForm } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

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
};

/** The three steps of the sign-up wizard, in order. */
const STEPS = [
    { title: 'Ko ste', hint: 'Naziv pod kojim vas kupci prepoznaju i gde vas mogu naći.' },
    { title: 'Kako vas dobijaju', hint: 'Kontakt i načini na koje roba stiže do kupca.' },
    { title: 'Kako se predstavljate', hint: 'Slike i priča — ovo je ono što kupca zadrži na stranici.' },
];

/** Keys must match Producer::DELIVERY_METHODS. */
const deliveryMethods = {
    licna_dostava: 'Lična dostava',
    kurirska_sluzba: 'Kurirska služba',
    preuzimanje: 'Lično preuzimanje',
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
                <Input id={id} type="file" accept="image/*" className="w-full max-w-xs" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
            </div>
            <InputError message={error} />
        </div>
    );
}

/**
 * The producer's own page, as a form.
 *
 * Signing up walks through it in three short steps (task 21): who you are,
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
}: {
    producer?: Producer;
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
    /** Step through the form instead of showing it all at once. */
    wizard?: boolean;
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
    });

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

    const [coverPreview, setCoverPreview] = useState<string | null>(producer?.cover_image_path ? `/storage/${producer.cover_image_path}` : null);
    const [logoPreview, setLogoPreview] = useState<string | null>(producer?.logo_path ? `/storage/${producer.logo_path}` : null);

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
        submitFn(action, { forceFormData: true });
    };

    const basics = (
        <>
            <div className="grid gap-2">
                <Label htmlFor="name">Naziv proizvođača</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="city">Grad</Label>
                <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                <InputError message={errors.city} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Adresa</Label>
                <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                <InputError message={errors.address} />
            </div>
        </>
    );

    const contact = (
        <>
            <div className="grid gap-2">
                <Label htmlFor="phone">Telefon za kontakt</Label>
                <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="+381 6x xxx xxxx" />
                <InputError message={errors.phone} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="contact_email">Email za kontakt</Label>
                <Input id="contact_email" type="email" value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} />
                <InputError message={errors.contact_email} />
            </div>

            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Način dostave</legend>
                <p className="text-muted-foreground -mt-1 mb-1 text-xs">Izaberite sve načine na koje kupci mogu da preuzmu robu.</p>
                {Object.entries(deliveryMethods).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={data.delivery_methods.includes(key)}
                            onChange={(e) => toggleDeliveryMethod(key, e.target.checked)}
                        />
                        {label}
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
                        placeholder="Npr. dostava autobusom"
                        maxLength={60}
                        aria-label="Svoj način dostave"
                    />
                    <Button type="button" variant="outline" onClick={addCustomMethod} disabled={!customMethod.trim()}>
                        Dodaj
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
                label="Naslovna slika"
                preview={coverPreview}
                error={errors.cover_image}
                onChange={(file) => {
                    setData('cover_image', file);
                    setCoverPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <ImageField
                id="logo"
                label="Logo"
                preview={logoPreview}
                error={errors.logo}
                onChange={(file) => {
                    setData('logo', file);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <div className="grid gap-2">
                <Label htmlFor="description">Opis</Label>
                <textarea
                    id="description"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="story">Priča o nastanku proizvoda</Label>
                <p className="text-muted-foreground -mt-1 text-xs">Kako nastaje ono što prodajete — tok proizvodnje, tradicija, sezona.</p>
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

    const groups = [basics, contact, presentation];

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
            <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Koraci">
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
                        <span className={cn(index === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{item.title}</span>
                        {index < STEPS.length - 1 && <span className="bg-border h-px w-5" aria-hidden />}
                    </li>
                ))}
            </ol>

            <p className="text-muted-foreground text-sm">{STEPS[step].hint}</p>

            <div className="space-y-6">{groups[step]}</div>

            <div className="flex flex-wrap items-center gap-2">
                {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                        Nazad
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
                        Dalje
                    </Button>
                )}

                <span className="text-muted-foreground text-xs">
                    Korak {step + 1} od {STEPS.length}
                </span>
            </div>
        </form>
    );
}
