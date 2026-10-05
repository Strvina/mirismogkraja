<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * "New from the producers you follow" - sent by digest:send-weekly, never
 * stored on the site: each item already reached the bell when it happened.
 */
class WeeklyDigest extends Notification
{
    /** Items named per producer and kind; the rest is a count. */
    private const ITEMS_SHOWN = 3;

    /** Producers named in one mail; a longer list is not read. */
    private const PRODUCERS_SHOWN = 6;

    /**
     * @param  list<array{name: string, url: string, products: list<array{name: string, url: string}>, posts: list<array{name: string, url: string}>}>  $producers
     */
    public function __construct(private readonly array $producers) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject(__('Novo od proizvođača koje pratite'))
            ->greeting(__('Zdravo!'))
            ->line(__('Ove nedelje kod proizvođača koje pratite:'));

        foreach (array_slice($this->producers, 0, self::PRODUCERS_SHOWN) as $producer) {
            $mail->line('**'.$this->link($producer['name'], $producer['url']).'**');

            if ($producer['products'] !== []) {
                $mail->line(__('Novi proizvodi: :list', ['list' => $this->listOf($producer['products'])]));
            }

            if ($producer['posts'] !== []) {
                $mail->line(__('Nove priče i recepti: :list', ['list' => $this->listOf($producer['posts'])]));
            }
        }

        if (count($this->producers) > self::PRODUCERS_SHOWN) {
            $mail->line(__('…i još :count proizvođača koje pratite.', ['count' => count($this->producers) - self::PRODUCERS_SHOWN]));
        }

        return $mail
            ->action(__('Šta je sada u sezoni'), route('marketplace.season.index'))
            ->line(__('Ne želite nedeljni pregled? [Isključite ga ovde](:url).', [
                'url' => URL::signedRoute('digest.unsubscribe', ['user' => $notifiable->getKey()]),
            ]));
    }

    /** @param  list<array{name: string, url: string}>  $items */
    private function listOf(array $items): string
    {
        $shown = array_map(fn (array $item) => $this->link($item['name'], $item['url']), array_slice($items, 0, self::ITEMS_SHOWN));
        $more = count($items) - count($shown);

        return implode(', ', $shown).($more > 0 ? ' '.__('i još :count', ['count' => $more]) : '');
    }

    /**
     * A Markdown link whose text is written by a producer. The mail is
     * rendered from Markdown, so a name is escaped: "[besplatno](http://…)"
     * as a product name has to arrive as those characters, not as a link
     * the platform appears to have sent.
     */
    private function link(string $text, string $url): string
    {
        return '['.preg_replace('/([\\\\`*_{}\[\]()#+\-.!|<>~])/', '\\\\$1', $text).']('.$url.')';
    }
}
