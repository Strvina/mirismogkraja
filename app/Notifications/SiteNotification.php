<?php

namespace App\Notifications;

use App\Support\LocalUrl;
use App\Support\NotificationText;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Everything the site tells a user, in one shape.
 *
 * The platform's notifications are all the same kind of thing - a short
 * sentence and a page to open - so they share one class with a named
 * constructor per occasion instead of a class per event.
 *
 * What is stored is the occasion and its facts (type, params, url), not the
 * sentence: the sentence is written when it is read, in the reader's
 * language, from lang/{locale}/notifications.php (see NotificationText).
 * Params whose name ends in "_on" are dates, formatted the same way.
 *
 * Only the database channel is used: mail would need a configured mailer and
 * a queue worker, and a notification nobody can see because delivery failed
 * is worse than one that waits in the bell.
 *
 * Messages are deliberately absent. The header already carries an unread
 * badge that polls, and the inbox lists every thread; a second stream saying
 * the same thing only buries the notifications that have nowhere else to
 * appear.
 */
class SiteNotification extends Notification
{
    use Queueable;

    private readonly ?string $url;

    /** Also sent as an e-mail (see alsoByMail). */
    private bool $byMail = false;

    /** @param  array<string, string|int>  $params */
    private function __construct(
        private readonly string $type,
        private readonly array $params,
        ?string $url,
    ) {
        // Stored as a path, so it opens on whichever host the reader uses.
        $this->url = $url === null ? null : LocalUrl::path($url);
    }

    // ---------------------------------------------------------------- producer

    public static function producerApproved(string $producerName, string $url): self
    {
        return new self('producer.approved', ['producer' => $producerName], $url);
    }

    public static function producerVerified(string $producerName, string $url): self
    {
        return new self('producer.verified', ['producer' => $producerName], $url);
    }

    public static function producerBlocked(string $producerName, string $url): self
    {
        return new self('producer.blocked', ['producer' => $producerName], $url);
    }

    /** A founding place, and the free Premium year that comes with it. */
    public static function foundingGranted(string $producerName, int $number, Carbon $endsOn, string $url): self
    {
        return new self('founding.granted', ['producer' => $producerName, 'number' => $number, 'ends_on' => $endsOn->toDateString()], $url);
    }

    public static function changeRequestApproved(string $requestedName, string $url): self
    {
        return new self('change-request.approved', ['name' => $requestedName], $url);
    }

    public static function changeRequestRejected(string $requestedName, string $url): self
    {
        return new self('change-request.rejected', ['name' => $requestedName], $url);
    }

    public static function productPublished(string $producerName, string $productName, string $url): self
    {
        return new self('product.published', ['producer' => $producerName, 'product' => $productName], $url);
    }

    public static function productBlocked(string $productName, string $url): self
    {
        return new self('product.blocked', ['product' => $productName], $url);
    }

    public static function productAvailable(string $productName, string $producerName, string $url): self
    {
        return new self('product.available', ['product' => $productName, 'producer' => $producerName], $url);
    }

    /** Buyers asked to hear when this product is back; told to its producer. */
    public static function productWanted(string $productName, int $waiting, string $url): self
    {
        return new self('product.wanted', ['product' => $productName, 'count' => $waiting], $url);
    }

    public static function reviewReceived(string $producerName, string $url): self
    {
        return new self('review.received', ['producer' => $producerName], $url);
    }

    public static function reviewReplied(string $producerName, string $url): self
    {
        return new self('review.replied', ['producer' => $producerName], $url);
    }

    public static function reviewPublished(string $producerName, string $url): self
    {
        return new self('review.published', ['producer' => $producerName], $url);
    }

    /** A producer someone follows wrote a story or a recipe. */
    public static function postPublished(string $producerName, string $title, string $url): self
    {
        return new self('post.published', ['producer' => $producerName, 'title' => $title], $url);
    }

    public static function postBlocked(string $title, string $url): self
    {
        return new self('post.blocked', ['title' => $title], $url);
    }

    /** An admin has checked the document; the certificate is on the public page. */
    public static function certificateApproved(string $title, string $url): self
    {
        return new self('certificate.approved', ['title' => $title], $url);
    }

    public static function certificateRejected(string $title, string $reason, string $url): self
    {
        return new self('certificate.rejected', ['title' => $title, 'reason' => $reason], $url);
    }

    public static function weeklyPick(string $producerName, Carbon $weekStartsOn, string $url): self
    {
        return new self('weekly-pick', ['producer' => $producerName, 'starts_on' => $weekStartsOn->toDateString()], $url);
    }

    // ---------------------------------------------------------------- paid by slip

    /** The slip is ready - the one thing left for the producer to do. */
    public static function membershipRequested(string $planName, int $amount, string $reference, string $url): self
    {
        return new self('membership.requested', ['plan' => $planName, 'amount' => number_format($amount, 0, ',', '.'), 'reference' => $reference], $url);
    }

    public static function membershipActivated(string $planName, Carbon $endsOn, string $url): self
    {
        return new self('membership.activated', ['plan' => $planName, 'ends_on' => $endsOn->toDateString()], $url);
    }

    public static function membershipEnding(string $planName, Carbon $endsOn, string $url): self
    {
        return new self('membership.ending', ['plan' => $planName, 'ends_on' => $endsOn->toDateString()], $url);
    }

    public static function membershipExpired(string $planName, string $url): self
    {
        return new self('membership.expired', ['plan' => $planName], $url);
    }

    public static function membershipCancelled(string $planName, string $url): self
    {
        return new self('membership.cancelled', ['plan' => $planName], $url);
    }

    public static function boostRequested(string $boostedName, int $amount, string $reference, string $url): self
    {
        return new self('boost.requested', ['name' => $boostedName, 'amount' => number_format($amount, 0, ',', '.'), 'reference' => $reference], $url);
    }

    public static function boostActivated(string $boostedName, Carbon $endsOn, string $url): self
    {
        return new self('boost.activated', ['name' => $boostedName, 'ends_on' => $endsOn->toDateString()], $url);
    }

    public static function boostEnding(string $boostedName, Carbon $endsOn, string $url): self
    {
        return new self('boost.ending', ['name' => $boostedName, 'ends_on' => $endsOn->toDateString()], $url);
    }

    public static function boostExpired(string $boostedName, string $url): self
    {
        return new self('boost.expired', ['name' => $boostedName], $url);
    }

    public static function boostCancelled(string $boostedName, string $url): self
    {
        return new self('boost.cancelled', ['name' => $boostedName], $url);
    }

    public static function campaignRequested(string $campaignName, int $amount, string $reference, string $url): self
    {
        return new self('campaign.requested', ['campaign' => $campaignName, 'amount' => number_format($amount, 0, ',', '.'), 'reference' => $reference], $url);
    }

    public static function campaignJoined(string $campaignName, string $url): self
    {
        return new self('campaign.joined', ['campaign' => $campaignName], $url);
    }

    public static function campaignCancelled(string $campaignName, string $url): self
    {
        return new self('campaign.cancelled', ['campaign' => $campaignName], $url);
    }

    /**
     * Stopped early, with money going back. $label names the kind ("Isticanje
     * profila") and is translated when read; without an account on file the
     * notification asks for one.
     */

    // ---------------------------------------------------------------- admin

    /** Something waiting on an admin; $kind names the queue it is in. */
    public static function forAdmins(string $kind, array $params, string $url): self
    {
        return new self('admin.'.$kind, $params, $url);
    }

    /**
     * Also by e-mail, to a confirmed address - for what the person asked to
     * be told about themselves, so it should not wait until they next open
     * the site. Everything else stays on the site's bell.
     */
    public function alsoByMail(): self
    {
        $this->byMail = true;

        return $this;
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return $this->byMail && $notifiable->email_verified_at !== null ? ['database', 'mail'] : ['database'];
    }

    /** The same words as on the site, in the recipient's language. */
    public function toMail(object $notifiable): MailMessage
    {
        $text = NotificationText::for($this->toArray($notifiable));

        $mail = (new MailMessage)
            ->subject($text['title'])
            ->greeting(__('Zdravo!'))
            ->line($text['body'] ?? '');

        return $this->url === null ? $mail : $mail->action(__('Pogledaj'), url($this->url));
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'params' => $this->params,
            'url' => $this->url,
        ];
    }
}
