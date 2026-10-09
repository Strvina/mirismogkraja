<?php

namespace App\Console\Commands;

use App\Support\Health;
use Illuminate\Console\Command;

/**
 * What `/up` checks, named one by one, for a person on the server. Ends
 * with an error when anything is wrong, so a script can ask too.
 */
class CheckHealth extends Command
{
    protected $signature = 'health:check';

    protected $description = 'Check the database, the cache, the storage folders and that cron is running';

    public function handle(): int
    {
        $problems = Health::problems();

        foreach ($problems as $name => $problem) {
            $problem === null
                ? $this->components->twoColumnDetail($name, '<fg=green>OK</>')
                : $this->components->twoColumnDetail($name, "<fg=red>{$problem}</>");
        }

        return array_filter($problems) === [] ? self::SUCCESS : self::FAILURE;
    }
}
