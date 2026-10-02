<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/** Proves the mail settings work - run it once after deploying or changing them. */
class SendTestMail extends Command
{
    protected $signature = 'mail:test {to : The address to send the test message to}';

    protected $description = 'Send a test e-mail with the current mail settings';

    public function handle(): int
    {
        $to = $this->argument('to');
        $mailer = config('mail.default');

        try {
            Mail::raw('Ako ste dobili ovu poruku, slanje mejlova radi.', fn ($message) => $message
                ->to($to)
                ->subject(config('app.name').' - test mejl'));
        } catch (Throwable $e) {
            $this->error("Sending through \"{$mailer}\" failed: ".$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Sent to {$to} through \"{$mailer}\".".($mailer === 'log' ? ' (The log mailer only writes it to the log.)' : ''));

        return self::SUCCESS;
    }
}
