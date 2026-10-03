<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;
use Throwable;

/** The key pair that turns push notifications on (App\Support\Push). Run once per site. */
class GenerateVapidKeys extends Command
{
    protected $signature = 'push:vapid';

    protected $description = 'Generate the VAPID keys for push notifications';

    public function handle(): int
    {
        try {
            $keys = VAPID::createVapidKeys();
        } catch (Throwable $e) {
            $this->error('Could not create the keys: '.$e->getMessage());

            if (PHP_OS_FAMILY === 'Windows') {
                $this->line('On Windows PHP needs to know where OpenSSL\'s configuration is. Once, in a terminal:');
                $this->line('  setx OPENSSL_CONF "C:\\xampp\\php\\extras\\ssl\\openssl.cnf"');
                $this->line('then open a new terminal and run this again. (A Linux server needs nothing.)');
            }

            return self::FAILURE;
        }

        $this->info('Add these to .env - and keep the private key private:');
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->line('VAPID_SUBJECT=mailto:'.(config('mail.from.address') ?: 'admin@example.com'));
        $this->warn('Changing the keys later turns off push on every device that had it on.');

        return self::SUCCESS;
    }
}
