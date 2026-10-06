import BasicsFields from '@/components/producer-form/basics-fields';
import ContactFields from '@/components/producer-form/contact-fields';
import PresentationFields from '@/components/producer-form/presentation-fields';
import { type ProducerFormData } from '@/components/producer-form/types';
import { firstStepWithError, StepIndicator, STEPS } from '@/components/producer-form/wizard-steps';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { scrollBackToStart } from '@/lib/motion';
import { type Category, type Producer } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import ProducerProductsStep from './producer-products-step';

/**
 * The producer's own page, as a form.
 *
 * Signing up walks through it in short steps: who you are, how buyers
 * reach you, how you present yourself, and a few first products. A single
 * page of fifteen fields is where people give up, and the step that takes
 * thought - photos and a story - comes after the short factual ones rather
 * than guarding them.
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
    const form = useForm<ProducerFormData>({
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
    const { data, setData, post, put, processing, errors } = form;
    const [step, setStep] = useState(0);

    // A step is left by the button at its foot, and the next one is rarely
    // as long: without this a phone shows the foot of the new step, or the
    // footer below it, and the step's first field has to be scrolled up to.
    const formRef = useRef<HTMLFormElement>(null);
    const shownStep = useRef(step);

    useEffect(() => {
        if (shownStep.current !== step && formRef.current) {
            scrollBackToStart(formRef.current);
        }

        shownStep.current = step;
    }, [step]);

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

        (method === 'post' ? post : put)(action, {
            forceFormData: true,
            // An error on a field from an earlier step is invisible from the
            // last one, so the wizard goes back to the first step that has one.
            onError: (failed) => {
                if (wizard) {
                    setStep(firstStepWithError(Object.keys(failed)));
                }
            },
        });
    };

    const fields = { data, setData, errors };
    const basics = <BasicsFields {...fields} />;
    const contact = <ContactFields {...fields} />;
    const presentation = <PresentationFields {...fields} coverPath={producer?.cover_image_path} logoPath={producer?.logo_path} />;

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

    const groups = [
        basics,
        contact,
        presentation,
        <ProducerProductsStep
            key="products"
            products={data.products}
            categories={categories}
            errors={errors as Record<string, string | undefined>}
            onChange={(next) => setData('products', next)}
        />,
    ];
    const isLastStep = step === STEPS.length - 1;

    return (
        <form ref={formRef} onSubmit={submit} className="max-w-xl space-y-6">
            <StepIndicator step={step} />

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
                    form before the last step has been filled in at all. */}
                {isLastStep ? (
                    <Button key="submit" type="submit" disabled={processing}>
                        {submitLabel}
                    </Button>
                ) : (
                    <Button key="next" type="button" onClick={() => setStep(step + 1)} disabled={step === 0 && !canLeaveFirstStep}>
                        {t('Dalje')}
                    </Button>
                )}

                {/* A button that will not press owes a reason. */}
                <span className="text-muted-foreground text-xs">
                    {step === 0 && !canLeaveFirstStep
                        ? t('Upišite naziv da biste nastavili.')
                        : t('Korak :current od :total', { current: step + 1, total: STEPS.length })}
                </span>
            </div>
        </form>
    );
}
