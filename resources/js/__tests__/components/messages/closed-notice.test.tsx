import ClosedNotice from '@/components/messages/closed-notice';
import { type ThreadSide } from '@/components/messages/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

interface Thread {
    closed?: ThreadSide | null;
    blockedBy?: ThreadSide | null;
    blockedByMe?: boolean;
    isOwner?: boolean;
}

function renderNotice({ closed = null, blockedBy = null, blockedByMe = false, isOwner = false }: Thread) {
    return render(<ClosedNotice closed={closed} blockedBy={blockedBy} blockedByMe={blockedByMe} isOwner={isOwner} otherName="Mlekara Zapis" />);
}

describe('ClosedNotice', () => {
    it('says nothing about a conversation that is open', () => {
        const { container } = renderNotice({});

        expect(container).toBeEmptyDOMElement();
    });

    it('tells a buyer the producer is no longer on the site', () => {
        renderNotice({ closed: 'producer' });

        expect(screen.getByText('Ovaj proizvođač više nije na sajtu. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')).toBeVisible();
    });

    it('tells a producer the buyer deleted their account', () => {
        renderNotice({ closed: 'buyer', isOwner: true });

        expect(screen.getByText('Ovaj korisnik je obrisao nalog. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')).toBeVisible();
    });

    it('tells whoever blocked it that they did, and how to carry on', () => {
        renderNotice({ blockedBy: 'buyer', blockedByMe: true });

        expect(
            screen.getByText('Blokirali ste ovaj razgovor — ni vi ni Mlekara Zapis ne možete da šaljete poruke. Odblokirajte ga da biste nastavili.'),
        ).toBeVisible();
    });

    it('tells a producer the buyer closed it', () => {
        renderNotice({ blockedBy: 'buyer', isOwner: true });

        expect(screen.getByText('Kupac je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.')).toBeVisible();
    });

    it('tells a buyer the producer closed it', () => {
        renderNotice({ blockedBy: 'producer', isOwner: false });

        expect(screen.getByText('Proizvođač je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.')).toBeVisible();
    });

    it('puts an account that is gone before a block: there is nobody left to unblock for', () => {
        renderNotice({ closed: 'producer', blockedBy: 'buyer', blockedByMe: true });

        expect(screen.getByText(/Ovaj proizvođač više nije na sajtu/)).toBeVisible();
        expect(screen.queryByText(/Blokirali ste ovaj razgovor/)).not.toBeInTheDocument();
    });
});
