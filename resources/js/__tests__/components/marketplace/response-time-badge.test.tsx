import ResponseTimeBadge from '@/components/marketplace/response-time-badge';
import { loadLocale } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ResponseTimeBadge', () => {
    it('says nothing until there is enough to go on', () => {
        const { container } = render(<ResponseTimeBadge bucket={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it.each([
        ['hour', 'Obično odgovara za manje od sat vremena'],
        ['hours', 'Obično odgovara u roku od nekoliko sati'],
        ['day', 'Obično odgovara u roku od jednog dana'],
        ['days', 'Obično odgovara za nekoliko dana'],
    ] as const)('puts "%s" into words', (bucket, sentence) => {
        render(<ResponseTimeBadge bucket={bucket} />);

        expect(screen.getByText(sentence)).toBeVisible();
    });

    it('translates the sentence', async () => {
        await loadLocale('en');
        const { container } = render(<ResponseTimeBadge bucket="hour" />);

        expect(container).not.toBeEmptyDOMElement();
        expect(screen.queryByText('Obično odgovara za manje od sat vremena')).not.toBeInTheDocument();
    });
});
