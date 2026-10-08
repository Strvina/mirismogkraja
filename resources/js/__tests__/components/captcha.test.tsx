import Captcha from '@/components/captcha';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type WidgetOptions = { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void };

const script = () => document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
const scripts = () => document.head.querySelectorAll('script[src*="turnstile"]');

/** Cloudflare's script arrives and defines its widget. */
function cloudflare() {
    const widget = {
        render: vi.fn<(element: HTMLElement, options: WidgetOptions) => string>().mockReturnValue('widget-1'),
        reset: vi.fn(),
        remove: vi.fn(),
    };

    return {
        widget,
        arrives: async () => {
            window.turnstile = widget;
            await act(async () => {
                script()?.dispatchEvent(new Event('load'));
            });
        },
        /** The options the page handed to the widget. */
        options: () => widget.render.mock.calls[0][1],
    };
}

async function scriptFailsToLoad() {
    await act(async () => {
        script()?.dispatchEvent(new Event('error'));
    });
}

afterEach(() => {
    delete window.turnstile;
});

// The script is loaded once for the life of the page, so the tests run in
// the order a visit would: off, blocked, then loaded.
describe('Captcha', () => {
    it('renders nothing and loads nothing while the server has it switched off', () => {
        const { container } = render(<Captcha siteKey={null} attempt={0} onToken={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
        expect(script()).toBeNull();
    });

    it("asks for Cloudflare's script only on a page that shows the check", () => {
        render(<Captcha siteKey="site-key" attempt={0} onToken={vi.fn()} />);

        expect(script()).toHaveAttribute('src', 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    });

    it('reserves the room of the widget, so the form does not jump when it appears', () => {
        const { container } = render(<Captcha siteKey="site-key" attempt={0} onToken={vi.fn()} />);

        expect(container.firstElementChild).toBeInTheDocument();
    });

    it('leaves the form usable when the script is blocked, and tries again on the next visit', async () => {
        const onToken = vi.fn();
        const first = render(<Captcha siteKey="site-key" attempt={0} onToken={onToken} />);

        await scriptFailsToLoad();

        expect(script()).toBeNull();
        expect(onToken).not.toHaveBeenCalled();

        first.unmount();
        render(<Captcha siteKey="site-key" attempt={0} onToken={onToken} />);

        expect(scripts()).toHaveLength(1);
    });

    it('draws the widget with the site key and hands the token to the form', async () => {
        const onToken = vi.fn();
        const { widget, arrives, options } = cloudflare();
        const { container } = render(<Captcha siteKey="site-key" attempt={0} onToken={onToken} />);

        await arrives();

        expect(widget.render).toHaveBeenCalledTimes(1);
        expect(widget.render.mock.calls[0][0]).toBe(container.firstElementChild);
        expect(options()).toMatchObject({ sitekey: 'site-key' });

        options().callback('token-123');

        expect(onToken).toHaveBeenLastCalledWith('token-123');
    });

    it('takes the token back when it expires or the check fails', async () => {
        const onToken = vi.fn();
        const { arrives, options } = cloudflare();
        render(<Captcha siteKey="site-key" attempt={0} onToken={onToken} />);
        await arrives();

        options().callback('token-123');
        options()['expired-callback']();
        expect(onToken).toHaveBeenLastCalledWith('');

        options().callback('token-456');
        options()['error-callback']();
        expect(onToken).toHaveBeenLastCalledWith('');
    });

    it('fetches a fresh token after each submit, since a token is good for one', async () => {
        const onToken = vi.fn();
        const { widget, arrives } = cloudflare();
        const { rerender } = render(<Captcha siteKey="site-key" attempt={0} onToken={onToken} />);
        await arrives();

        expect(widget.reset).not.toHaveBeenCalled();

        rerender(<Captcha siteKey="site-key" attempt={1} onToken={onToken} />);

        expect(onToken).toHaveBeenLastCalledWith('');
        expect(widget.reset).toHaveBeenCalledExactlyOnceWith('widget-1');
    });

    it('reports to the newest callback the form passes', async () => {
        const first = vi.fn();
        const second = vi.fn();
        const { arrives, options } = cloudflare();
        const { rerender } = render(<Captcha siteKey="site-key" attempt={0} onToken={first} />);
        await arrives();

        rerender(<Captcha siteKey="site-key" attempt={0} onToken={second} />);
        options().callback('token-123');

        expect(second).toHaveBeenCalledWith('token-123');
        expect(first).not.toHaveBeenCalled();
    });

    it('removes the widget when the form goes away', async () => {
        const { widget, arrives } = cloudflare();
        const { unmount } = render(<Captcha siteKey="site-key" attempt={0} onToken={vi.fn()} />);
        await arrives();

        unmount();

        expect(widget.remove).toHaveBeenCalledExactlyOnceWith('widget-1');
    });

    it('does not load the script a second time on a later page', async () => {
        const { widget, arrives } = cloudflare();
        render(<Captcha siteKey="site-key" attempt={0} onToken={vi.fn()} />);

        // Already loaded by an earlier form: there is nothing to wait for.
        await arrives();

        expect(scripts()).toHaveLength(1);
        expect(widget.render).toHaveBeenCalledTimes(1);
    });
});
