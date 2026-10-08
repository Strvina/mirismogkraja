import CertificateList, { type PublicCertificate } from '@/components/producer-page/certificate-list';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const certificate = (overrides: Partial<PublicCertificate> = {}): PublicCertificate => ({
    id: 1,
    type: 'organic',
    type_label: 'Organska proizvodnja',
    title: 'Sertifikat organske proizvodnje',
    issuer: 'Organic Control System',
    expires_on: '2027-03-31',
    ...overrides,
});

describe('CertificateList', () => {
    it('is not on the page of a producer with no confirmed documents', () => {
        const { container } = render(<CertificateList certificates={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('lists each one with its kind, who issued it and until when it holds', () => {
        render(<CertificateList certificates={[certificate()]} />);

        expect(screen.getByRole('heading', { name: 'Sertifikati i priznanja' })).toBeVisible();
        expect(screen.getByRole('listitem')).toHaveTextContent(
            'Sertifikat organske proizvodnjeOrganska proizvodnjaIzdao: Organic Control SystemVaži do 31. mart 2027.',
        );
    });

    it('leaves out the issuer and the date a certificate does not have', () => {
        render(<CertificateList certificates={[certificate({ issuer: null, expires_on: null })]} />);

        expect(screen.getByRole('listitem')).toHaveTextContent(/^Sertifikat organske proizvodnjeOrganska proizvodnja$/);
    });

    it('keeps the order the server gave', () => {
        render(<CertificateList certificates={[certificate({ id: 1, title: 'Prvi' }), certificate({ id: 2, title: 'Drugi' })]} />);

        expect(screen.getAllByRole('listitem').map((item) => item.textContent?.slice(0, 5))).toEqual(['PrviO', 'Drugi']);
    });
});
