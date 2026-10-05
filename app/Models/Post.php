<?php

namespace App\Models;

use App\Models\Concerns\KeepsOldSlugs;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/** A story or a recipe written by a producer. */
class Post extends Model
{
    use KeepsOldSlugs;

    public const TYPE_STORY = 'story';

    public const TYPE_RECIPE = 'recipe';

    /**
     * Keyed by what is stored in `type`; the public list filters by the
     * Serbian word in the address (?vrsta=recept).
     *
     * @var array<string, string>
     */
    public const TYPES = [self::TYPE_STORY => 'Priča', self::TYPE_RECIPE => 'Recept'];

    /** @var array<string, string> */
    public const TYPE_FILTERS = ['prica' => self::TYPE_STORY, 'recept' => self::TYPE_RECIPE];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    /** Set only by an administrator; the author cannot lift it. */
    public const STATUS_BLOCKED = 'blocked';

    /** What an author may choose for their own post. */
    public const OWNER_STATUSES = [self::STATUS_DRAFT, self::STATUS_PUBLISHED];

    /** @var list<string> */
    public const STATUSES = [self::STATUS_DRAFT, self::STATUS_PUBLISHED, self::STATUS_BLOCKED];

    public const MAX_PER_PRODUCER = 100;

    public const BODY_MAX = 10000;

    /** Shorter than this is a caption, not something to open a page for. */
    public const BODY_MIN = 100;

    /** What a card in a list shows. */
    public const CARD_COLUMNS = ['id', 'producer_id', 'type', 'title', 'slug', 'excerpt', 'cover_image_path', 'published_at'];

    protected $fillable = ['type', 'title', 'slug', 'excerpt', 'body', 'ingredients', 'cover_image_path', 'product_id', 'status'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * What the public may read: published, by a producer that is itself
     * published. The query twin of isPubliclyVisible().
     *
     * @param  Builder<Post>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where($query->qualifyColumn('status'), self::STATUS_PUBLISHED)->whereHas('producer', fn (Builder $producer) => $producer->published());
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status === self::STATUS_PUBLISHED && $this->producer?->status === 'active';
    }

    public function isRecipe(): bool
    {
        return $this->type === self::TYPE_RECIPE;
    }

    /** The opening of the text, for cards and link previews. */
    public static function excerptFrom(string $body): string
    {
        return Str::limit(Str::squish($body), 220);
    }

    /**
     * The ingredients as a list, one per non-empty line.
     *
     * @return list<string>
     */
    public function ingredientList(): array
    {
        return collect(preg_split('/\R/u', (string) $this->ingredients))
            ->map(fn (string $line) => trim($line))
            ->filter()
            ->values()
            ->all();
    }
}
