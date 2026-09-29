<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use MassPrunable;

    /**
     * How long entries are kept. The log answers "who changed this, and
     * when" for recent disputes; past a year nobody asks, and it is the
     * fastest-growing table the site has.
     */
    public const KEEP_MONTHS = 12;

    protected $fillable = [
        'user_id',
        'user_name',
        'action',
        'subject_type',
        'subject_id',
        'subject_label',
        'changes',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * What model:prune removes - in one DELETE, without loading the rows.
     *
     * @return Builder<ActivityLog>
     */
    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subMonths(self::KEEP_MONTHS));
    }
}
