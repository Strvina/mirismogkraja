<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A saved answer the producer drops into a conversation with one tap.
 *
 * @property int $id
 * @property int $producer_id
 * @property string $title
 * @property string $body
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 */
class QuickReply extends Model
{
    /** A menu in the message box: past a dozen it stops being quick. */
    public const MAX_PER_PRODUCER = 12;

    /** Half of a message, so there is always room to add to it. */
    public const BODY_MAX = 1000;

    /**
     * What a new list can start from. Serbian here and translated when
     * created, into the language the producer uses the site in.
     *
     * @var array<string, string>
     */
    public const STARTERS = [
        'Dostupnost i cena' => 'Dobar dan! Proizvod je dostupan. Javite koliko vam treba, pa ćemo se dogovoriti oko preuzimanja ili dostave.',
        'Dostava' => 'Šaljemo kurirskom službom na teritoriji cele Srbije. Paket obično stiže za jedan do dva radna dana, a poštarinu plaća kupac.',
        'Trenutno nema' => 'Hvala na interesovanju! Trenutno nemamo na stanju. Javiću vam čim ponovo bude dostupno.',
    ];

    protected $fillable = ['title', 'body'];

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }
}
