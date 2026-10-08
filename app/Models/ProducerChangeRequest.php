<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A change to a producer that its owner may ask for but not make.
 *
 * Stored as field/value rather than as a column per field, so widening the
 * line later - say, to the contact e-mail - is a constant in the service
 * rather than a migration.
 *
 * @property int $id
 * @property int $producer_id
 * @property int $requested_by
 * @property string $field
 * @property string|null $current_value
 * @property string $requested_value
 * @property string $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 * @property-read User|null $requester
 */
class ProducerChangeRequest extends Model
{
    use CountsByStatus;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_REJECTED];

    protected $fillable = [
        'producer_id',
        'requested_by',
        'field',
        'current_value',
        'requested_value',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    /** @return BelongsTo<User, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by')->withTrashed();
    }

    /** @param  Builder<ProducerChangeRequest>  $query */
    public function scopePending(Builder $query): void
    {
        $query->where('status', self::STATUS_PENDING);
    }
}
