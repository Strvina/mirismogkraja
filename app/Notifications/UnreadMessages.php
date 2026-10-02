<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/** "You have a message" - sent by messages:email-unread, never stored on the site. */
class UnreadMessages extends Notification
{
    public function __construct(
        private readonly string $from,
        private readonly int $count,
        private readonly string $preview,
        private readonly string $url,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Nova poruka od :name', ['name' => $this->from]))
            ->greeting(__('Zdravo!'))
            ->line($this->count > 1
                ? __(':name vam je poslao/la nove poruke (:count). Poslednja:', ['name' => $this->from, 'count' => $this->count])
                : __(':name vam je poslao/la poruku:', ['name' => $this->from]))
            ->line('„'.Str::limit(Str::squish($this->preview), 300).'”')
            ->action(__('Odgovori'), $this->url)
            ->line(__('Ne želite mejl za svaku novu poruku? [Isključite ih ovde](:url).', [
                'url' => URL::signedRoute('message-emails.unsubscribe', ['user' => $notifiable->getKey()]),
            ]));
    }
}
