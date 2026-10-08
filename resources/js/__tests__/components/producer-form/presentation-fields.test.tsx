import { ProducerFormHarness } from '@/__tests__/support/producer-form';
import { createUser } from '@/__tests__/support/render';
import PresentationFields from '@/components/producer-form/presentation-fields';
import { type ProducerFormData } from '@/components/producer-form/types';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Shrinking needs a canvas; its own tests cover it. Here a photo comes back
// under a new name, so it is plain which file reached the form.
vi.mock('@/lib/shrink-image', () => ({
    shrinkImage: vi.fn(async (file: File) => new File([file], `smanjena-${file.name}`, { type: file.type })),
}));

interface Options {
    initial?: Partial<ProducerFormData>;
    errors?: Partial<Record<keyof ProducerFormData, string>>;
    coverPath?: string | null;
    logoPath?: string | null;
}

function renderFields({ initial = {}, errors = {}, coverPath, logoPath }: Options = {}) {
    const onData = vi.fn();
    const view = render(
        <ProducerFormHarness initial={initial} errors={errors} onData={onData}>
            {(fields) => <PresentationFields {...fields} coverPath={coverPath} logoPath={logoPath} />}
        </ProducerFormHarness>,
    );

    return { ...view, user: createUser(), data: () => onData.mock.lastCall?.[0] as ProducerFormData };
}

const photo = (name: string) => new File(['slika'], name, { type: 'image/jpeg' });
const previews = (container: HTMLElement) => Array.from(container.querySelectorAll('img')).map((image) => image.getAttribute('src'));

describe('PresentationFields', () => {
    it('takes the description and the story of how the products are made', async () => {
        const { user, data } = renderFields();

        await user.type(screen.getByLabelText('Opis'), 'Sir i kajmak.');
        await user.type(screen.getByLabelText('Priča o nastanku proizvoda'), 'Od 1978.');

        expect(data()).toMatchObject({ description: 'Sir i kajmak.', story: 'Od 1978.' });
    });

    it('starts from the text already saved', () => {
        renderFields({ initial: { description: 'Sir i kajmak.', story: 'Od 1978.' } });

        expect(screen.getByLabelText('Opis')).toHaveValue('Sir i kajmak.');
        expect(screen.getByLabelText('Priča o nastanku proizvoda')).toHaveValue('Od 1978.');
    });

    it("shows the server's message under each of the four fields", () => {
        renderFields({
            errors: {
                cover_image: 'Slika je prevelika.',
                logo: 'Logo mora biti slika.',
                description: 'Opis je predugačak.',
                story: 'Priča je predugačka.',
            },
        });

        expect(screen.getByText('Slika je prevelika.')).toBeVisible();
        expect(screen.getByText('Logo mora biti slika.')).toBeVisible();
        expect(screen.getByText('Opis je predugačak.')).toBeVisible();
        expect(screen.getByText('Priča je predugačka.')).toBeVisible();
    });

    describe('the cover and the logo', () => {
        it('accept images only', () => {
            renderFields();

            expect(screen.getByLabelText('Naslovna slika')).toHaveAttribute('accept', 'image/*');
            expect(screen.getByLabelText('Logo')).toHaveAttribute('accept', 'image/*');
        });

        it('show no preview on a new form', () => {
            const { container } = renderFields();

            expect(previews(container)).toEqual([]);
        });

        it('show the pictures already saved', () => {
            const { container } = renderFields({ coverPath: 'covers/zapis.jpg', logoPath: 'logos/zapis.jpg' });

            expect(previews(container)).toEqual(['/storage/covers/zapis.jpg', '/storage/logos/zapis.jpg']);
        });

        it('put the shrunken photo into the form and preview it in place of the saved one', async () => {
            const { user, data, container } = renderFields({ coverPath: 'covers/zapis.jpg' });

            await user.upload(screen.getByLabelText('Naslovna slika'), photo('pasnjak.jpg'));

            await waitFor(() => expect(data().cover_image?.name).toBe('smanjena-pasnjak.jpg'));
            expect(data().logo).toBeNull();
            expect(previews(container)).toEqual(['blob:test/smanjena-pasnjak.jpg']);
        });

        it('keep the two apart', async () => {
            const { user, data } = renderFields();

            await user.upload(screen.getByLabelText('Logo'), photo('znak.jpg'));

            await waitFor(() => expect(data().logo?.name).toBe('smanjena-znak.jpg'));
            expect(data().cover_image).toBeNull();
        });

        it('still show a chosen photo after the step is left and come back to', async () => {
            const first = renderFields({ initial: { cover_image: photo('pasnjak.jpg') } });

            expect(previews(first.container)).toEqual(['blob:test/pasnjak.jpg']);
        });

        it('release the preview of a photo that was replaced', async () => {
            const revoke = vi.spyOn(URL, 'revokeObjectURL');
            const { user, data } = renderFields();

            await user.upload(screen.getByLabelText('Logo'), photo('prvi.jpg'));
            await waitFor(() => expect(data().logo?.name).toBe('smanjena-prvi.jpg'));
            await user.upload(screen.getByLabelText('Logo'), photo('drugi.jpg'));
            await waitFor(() => expect(data().logo?.name).toBe('smanjena-drugi.jpg'));

            expect(revoke).toHaveBeenCalledWith('blob:test/smanjena-prvi.jpg');
        });
    });
});
