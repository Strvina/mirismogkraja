<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Everything the site tells a user, in one shape.
 *
 * The platform's notifications are all the same kind of thing - a short
 * sentence and a page to open - so they share one class with a named
 * constructor per occasion instead of a class per event. That keeps the
 * stored payload uniform, which is what lets the bell render any of them
 * without knowing which event produced it, and it means adding a new
 * occasion is one method rather than a new file.
 *
 * Only the database channel is used: mail would need a configured mailer and
 * a queue worker, and a notification nobody can see because delivery failed
 * is worse than one that waits in the bell.
 */
class SiteNotification extends Notification
{
    use Queueable;

    private function __construct(
        private readonly string $type,
        private readonly string $title,
        private readonly ?string $body,
        private readonly ?string $url,
    ) {}

    public static function producerApproved(string $producerName, string $url): self
    {
        return new self(
            'producer.approved',
            'Vaš proizvođač je odobren',
            "„{$producerName}” je od sada vidljiv svima na sajtu.",
            $url,
        );
    }

    public static function producerVerified(string $producerName, string $url): self
    {
        return new self(
            'producer.verified',
            'Vaš profil je proveren',
            "„{$producerName}” od sada nosi oznaku proverenog proizvođača.",
            $url,
        );
    }

    public static function producerBlocked(string $producerName, string $url): self
    {
        return new self(
            'producer.blocked',
            'Vaš proizvođač je skriven',
            "„{$producerName}” trenutno nije vidljiv na sajtu. Javite nam se ako mislite da je greška.",
            $url,
        );
    }

    public static function changeRequestApproved(string $requestedName, string $url): self
    {
        return new self(
            'change-request.approved',
            'Izmena naziva je odobrena',
            "Vaš proizvođač se od sada zove „{$requestedName}”.",
            $url,
        );
    }

    public static function changeRequestRejected(string $requestedName, string $url): self
    {
        return new self(
            'change-request.rejected',
            'Izmena naziva nije odobrena',
            "Naziv „{$requestedName}” nije prihvaćen, pa ostaje dosadašnji. Javite nam se ako vam treba pomoć.",
            $url,
        );
    }

    public static function messageReceived(string $senderName, string $preview, string $url): self
    {
        return new self(
            'message.received',
            "Nova poruka od {$senderName}",
            $preview,
            $url,
        );
    }

    public static function productPublished(string $producerName, string $productName, string $url): self
    {
        return new self(
            'product.published',
            "{$producerName} ima nešto novo",
            "„{$productName}” je upravo objavljen.",
            $url,
        );
    }

    public static function reviewReceived(string $producerName, string $url): self
    {
        return new self(
            'review.received',
            'Novi utisak o vama',
            "Neko je ostavio utisak o „{$producerName}”. Biće objavljen kada ga pregledamo.",
            $url,
        );
    }

    public static function reviewPublished(string $producerName, string $url): self
    {
        return new self(
            'review.published',
            'Vaš utisak je objavljen',
            "Utisak o „{$producerName}” je od sada vidljiv svima.",
            $url,
        );
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
        ];
    }
}
