import { createUser } from '@/__tests__/support/render';
import SearchBox from '@/components/marketplace/search-box';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('SearchBox', () => {
    it('is a search landmark with a field named after what it searches', () => {
        render(<SearchBox onSearch={vi.fn()} />);

        expect(screen.getByRole('search')).toBeInTheDocument();
        expect(screen.getByRole('searchbox', { name: 'Pretraži proizvode…' })).toHaveAttribute('placeholder', 'Pretraži proizvode…');
    });

    it("takes the page's own wording", () => {
        render(<SearchBox onSearch={vi.fn()} placeholder="Pretraži proizvođače…" />);

        expect(screen.getByRole('searchbox', { name: 'Pretraži proizvođače…' })).toBeInTheDocument();
    });

    it('searches on Enter, not while typing', async () => {
        const user = createUser();
        const onSearch = vi.fn();
        render(<SearchBox onSearch={onSearch} />);

        await user.type(screen.getByRole('searchbox'), 'ajvar');
        expect(onSearch).not.toHaveBeenCalled();

        await user.keyboard('{Enter}');
        expect(onSearch).toHaveBeenCalledExactlyOnceWith('ajvar');
    });

    it('trims the spaces around what was typed', async () => {
        const user = createUser();
        const onSearch = vi.fn();
        render(<SearchBox onSearch={onSearch} />);

        await user.type(screen.getByRole('searchbox'), '  domaći med  {Enter}');

        expect(onSearch).toHaveBeenCalledExactlyOnceWith('domaći med');
    });

    it('reports an emptied field as an empty search, so the page can clear it', async () => {
        const user = createUser();
        const onSearch = vi.fn();
        render(<SearchBox value="ajvar" onSearch={onSearch} />);

        await user.clear(screen.getByRole('searchbox'));
        await user.keyboard('{Enter}');

        expect(onSearch).toHaveBeenCalledExactlyOnceWith('');
    });

    it('starts with the search the page is showing', () => {
        render(<SearchBox value="ajvar" onSearch={vi.fn()} />);

        expect(screen.getByRole('searchbox')).toHaveValue('ajvar');
    });

    it('follows the page back to an earlier search, over whatever was typed since', async () => {
        const user = createUser();
        const { rerender } = render(<SearchBox value="ajvar" onSearch={vi.fn()} />);

        await user.type(screen.getByRole('searchbox'), ' ljuti');
        rerender(<SearchBox value="med" onSearch={vi.fn()} />);

        expect(screen.getByRole('searchbox')).toHaveValue('med');
    });

    it('takes no more than a hundred characters', () => {
        render(<SearchBox onSearch={vi.fn()} />);

        expect(screen.getByRole('searchbox')).toHaveAttribute('maxlength', '100');
    });
});
