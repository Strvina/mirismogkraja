<?php

namespace App\Console\Commands;

use App\Models\Conversation;
use Illuminate\Console\Command;

/**
 * Works every conversation's summary out again from the messages. Not
 * scheduled: the summary is kept current as messages are written and read.
 * For the day a message is changed by hand in the database, or the counts
 * look wrong.
 */
class RebuildConversations extends Command
{
    protected $signature = 'messages:rebuild-conversations';

    protected $description = 'Recount every conversation (last message, unread on each side) from its messages';

    public function handle(): int
    {
        $this->components->info(Conversation::rebuild().' conversations rebuilt.');

        return self::SUCCESS;
    }
}
