import { paginated } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Pagination, { type PaginatedMeta } from '@/components/marketplace/pagination';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pages = (page: number, lastPage: number): PaginatedMeta => paginated(['red'], { page, lastPage });

const nav = () => screen.getByRole('navigation', { name: 'Stranice' });
const linkNames = () =>
    within(nav())
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label') ?? link.textContent);

/** The other page of the list has been drawn: Pagination waits two frames for its cards. */
const twoFrames = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

describe('Pagination', () => {
    it('is not there for a list that fits on one page', () => {
        const { container } = renderOnPage(<Pagination meta={pages(1, 1)} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('is not there for an empty list', () => {
        const { container } = renderOnPage(<Pagination meta={paginated([])} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('links to every page, with the arrows named in words', () => {
        renderOnPage(<Pagination meta={pages(2, 3)} />);

        expect(linkNames()).toEqual(['Prethodna stranica', '1', '2', '3', 'Sledeća stranica']);
        expect(within(nav()).getByRole('link', { name: 'Prethodna stranica' })).toHaveAttribute('href', '/lista?page=1');
        expect(within(nav()).getByRole('link', { name: 'Sledeća stranica' })).toHaveAttribute('href', '/lista?page=3');
    });

    it('marks the page the reader is on', () => {
        renderOnPage(<Pagination meta={pages(2, 3)} />);

        expect(within(nav()).getByRole('link', { current: 'page' })).toHaveTextContent('2');
    });

    it('has no way back from the first page', () => {
        renderOnPage(<Pagination meta={pages(1, 3)} />);

        expect(linkNames()).toEqual(['1', '2', '3', 'Sledeća stranica']);
    });

    it('has no way forward from the last page', () => {
        renderOnPage(<Pagination meta={pages(3, 3)} />);

        expect(linkNames()).toEqual(['Prethodna stranica', '1', '2', '3']);
    });

    it('shows the gap Laravel leaves in a long list as something that cannot be followed', () => {
        const meta = pages(1, 3);

        meta.links.splice(3, 0, { url: null, label: '...', active: false });
        renderOnPage(<Pagination meta={meta} />);

        expect(nav()).toHaveTextContent('...');
        expect(within(nav()).queryByRole('link', { name: '...' })).not.toBeInTheDocument();
    });

    it('asks for the other page without throwing the reader to the top of the whole page', async () => {
        const { user } = renderOnPage(<Pagination meta={pages(1, 3)} />);

        await user.click(within(nav()).getByRole('link', { name: '2' }));

        expect(lastVisit()).toMatchObject({ method: 'get', url: '/lista?page=2', options: { preserveScroll: true } });
    });

    describe('once the other page has arrived', () => {
        function listAt(top: number, label: string) {
            return (
                <section aria-label={label} ref={(element) => void (element && (element.getBoundingClientRect = () => ({ top }) as DOMRect))}>
                    <Pagination meta={pages(1, 3)} />
                </section>
            );
        }

        it('takes a reader at the foot of the list back to its start', async () => {
            const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
            const { user } = renderOnPage(listAt(-900, 'Utisci'));

            await user.click(screen.getByRole('link', { name: '2' }));
            lastVisit().succeed();

            expect(scrollTo).not.toHaveBeenCalled();
            await twoFrames();

            expect(scrollTo).toHaveBeenCalledTimes(1);
        });

        it('leaves a reader who can already see the start where they are', async () => {
            const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
            const { user } = renderOnPage(listAt(300, 'Utisci'));

            await user.click(screen.getByRole('link', { name: '2' }));
            lastVisit().succeed();
            await twoFrames();

            expect(scrollTo).not.toHaveBeenCalled();
        });

        it('goes back to the start of the list that was paged, on a page that holds two', async () => {
            const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
            const { user } = renderOnPage(
                <>
                    {listAt(300, 'Proizvodi')}
                    {listAt(-900, 'Utisci')}
                </>,
            );

            // The first list is in view, the second is far above its own start.
            await user.click(within(screen.getByRole('region', { name: 'Proizvodi' })).getByRole('link', { name: '2' }));
            lastVisit().succeed();
            await twoFrames();
            expect(scrollTo).not.toHaveBeenCalled();

            await user.click(within(screen.getByRole('region', { name: 'Utisci' })).getByRole('link', { name: '2' }));
            lastVisit().succeed();
            await twoFrames();
            expect(scrollTo).toHaveBeenCalledTimes(1);
        });

        it('does not move the page when the request fails', async () => {
            const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
            const { user } = renderOnPage(listAt(-900, 'Utisci'));

            await user.click(screen.getByRole('link', { name: '2' }));
            lastVisit().drop();
            await twoFrames();

            expect(scrollTo).not.toHaveBeenCalled();
        });
    });
});
