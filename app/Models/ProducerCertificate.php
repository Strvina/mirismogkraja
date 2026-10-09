<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * A document behind something a producer claims - organic, protected
 * origin, a registered farm. Public only as a line on their page, and only
 * after an admin has looked at the document.
 *
 * @property int $id
 * @property int $producer_id
 * @property string $type
 * @property string $title
 * @property string|null $issuer
 * @property Carbon|null $issued_on
 * @property Carbon|null $expires_on
 * @property string $file_path
 * @property string $status
 * @property string|null $rejection_reason
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 */
class ProducerCertificate extends Model
{
    use CountsByStatus;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_REJECTED];

    /**
     * What a document can be, keyed by what is stored in `type`.
     *
     * @var array<string, string>
     */
    public const TYPES = [
        'organic' => 'Organska proizvodnja',
        'geographic' => 'Zaštićeno geografsko poreklo',
        'registered_farm' => 'Registrovano poljoprivredno gazdinstvo',
        'food_safety' => 'Bezbednost hrane (HACCP i slično)',
        'award' => 'Nagrada ili priznanje',
        'other' => 'Drugo',
    ];

    public const MAX_PER_PRODUCER = 10;

    /** Scans and photographed pages run larger than a product photo. */
    public const MAX_KILOBYTES = 5120;

    /**
     * Where the documents are kept: the private disk, which no web address
     * reaches. They carry names, addresses and registration numbers, so
     * they are sent only through a route that checks who is asking.
     */
    public const DISK = 'local';

    protected $fillable = ['type', 'title', 'issuer', 'issued_on', 'expires_on', 'file_path', 'status', 'rejection_reason', 'reviewed_by', 'reviewed_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'issued_on' => 'date:Y-m-d',
            'expires_on' => 'date:Y-m-d',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // The row and the document go together.
        static::deleted(fn (self $certificate) => Storage::disk(self::DISK)->delete($certificate->file_path));
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class)->withTrashed();
    }

    /**
     * What a visitor may see: checked by an admin and still in date.
     *
     * @param  Builder<ProducerCertificate>  $query
     */
    public function scopeShown(Builder $query): void
    {
        $query
            ->where($query->qualifyColumn('status'), self::STATUS_APPROVED)
            ->where(fn (Builder $date) => $date
                ->whereNull($query->qualifyColumn('expires_on'))
                ->orWhere($query->qualifyColumn('expires_on'), '>=', now()->toDateString()));
    }

    public function isExpired(): bool
    {
        return $this->expires_on !== null && $this->expires_on->isBefore(today());
    }

    /** The file's extension, for the name it is downloaded under. */
    public function extension(): string
    {
        return strtolower(pathinfo($this->file_path, PATHINFO_EXTENSION));
    }
}
