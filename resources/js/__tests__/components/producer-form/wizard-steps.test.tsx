import { firstStepWithError, StepIndicator, STEPS } from '@/components/producer-form/wizard-steps';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('firstStepWithError', () => {
    it.each([
        ['name', 0],
        ['city', 0],
        ['address', 0],
        ['lat', 0],
        ['lng', 0],
        ['phone', 1],
        ['contact_email', 1],
        ['delivery_methods', 1],
        ['cover_image', 2],
        ['logo', 2],
        ['description', 2],
        ['story', 2],
    ])('finds %s on step %i', (field, step) => {
        expect(firstStepWithError([field])).toBe(step);
    });

    it("finds the products' own errors on the last step", () => {
        expect(firstStepWithError(['products'])).toBe(3);
        expect(firstStepWithError(['products.0.name'])).toBe(3);
        expect(firstStepWithError(['products.2.price', 'products.2.category_id'])).toBe(3);
    });

    it('goes back to the earliest step when several have errors', () => {
        expect(firstStepWithError(['products.0.name', 'description', 'phone'])).toBe(1);
        expect(firstStepWithError(['story', 'name'])).toBe(0);
    });

    it('starts over from the first step for an error on a field it does not know', () => {
        expect(firstStepWithError(['captcha'])).toBe(0);
    });
});

describe('StepIndicator', () => {
    const steps = () => within(screen.getByRole('list', { name: 'Koraci' })).getAllByRole('listitem');

    it('names the four steps of signing up, in order', () => {
        render(<StepIndicator step={0} />);

        expect(STEPS).toHaveLength(4);
        expect(steps().map((step) => step.textContent)).toEqual(['1Ko ste', '2Kako vas dobijaju', '3Kako se predstavljate', '4Proizvodi']);
    });

    it.each([0, 1, 2, 3])('marks step %i as the one the producer is on, and only that one', (current) => {
        render(<StepIndicator step={current} />);

        const marked = steps().map((step) => step.querySelector('[aria-current="step"]') !== null);

        expect(marked).toEqual([0, 1, 2, 3].map((index) => index === current));
    });

    it('ticks off the steps already done in place of their numbers', () => {
        render(<StepIndicator step={2} />);

        expect(steps().map((step) => step.textContent)).toEqual(['Ko ste', 'Kako vas dobijaju', '3Kako se predstavljate', '4Proizvodi']);
    });
});
