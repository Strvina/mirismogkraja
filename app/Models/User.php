<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string|null $password
 * @property string|null $remember_token
 * @property string|null $phone
 * @property string|null $avatar_path
 * @property string|null $address
 * @property string|null $city
 * @property numeric-string|null $lat
 * @property numeric-string|null $lng
 * @property Carbon|null $blocked_at
 * @property bool $notify_messages_by_email
 * @property bool $notify_weekly_digest
 * @property Carbon|null $digest_sent_at
 * @property string|null $two_factor_secret
 * @property list<string>|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $locale
 * @property string|null $google_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, Producer> $producers
 * @property-read Collection<int, WantedAd> $wantedAds
 * @property-read Collection<int, ProducerMessage> $messages
 * @property-read Collection<int, Review> $reviews
 * @property-read Collection<int, Producer> $followedProducers
 * @property-read Collection<int, Favorite> $favorites
 */
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    /** What a deleted account's personal fields are set to. */
    public const ANONYMISED = [
        'name' => 'Obrisan korisnik',
        'phone' => null,
        'address' => null,
        'city' => null,
        'lat' => null,
        'lng' => null,
        'avatar_path' => null,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar_path',
        'address',
        'city',
        'lat',
        'lng',
        'notify_messages_by_email',
        'notify_weekly_digest',
    ];

    /**
     * Sent after the response: registering doesn't wait on the mail server,
     * and a mail server that is down can't turn a created account into an
     * error page - the failure is reported, and the link can be re-sent.
     */
    public function sendEmailVerificationNotification(): void
    {
        dispatch(fn () => $this->notify(new VerifyEmail))->afterResponse();
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google_id',
        // The signed-in user is sent to every page; these never are.
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * False for an account opened with Google whose owner has not set a
     * password yet: there is no current password to ask them for.
     */
    public function hasPassword(): bool
    {
        return $this->password !== null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'blocked_at' => 'datetime',
            'notify_messages_by_email' => 'boolean',
            'notify_weekly_digest' => 'boolean',
            'digest_sent_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /** E-mails go out in the language the person last used the site in. */
    public function preferredLocale(): ?string
    {
        return $this->locale;
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    /** Signing in asks for a code from their authenticator app as well. */
    public function hasTwoFactor(): bool
    {
        return $this->two_factor_confirmed_at !== null && $this->two_factor_secret !== null;
    }

    /** @return HasMany<Producer, $this> */
    public function producers(): HasMany
    {
        return $this->hasMany(Producer::class);
    }

    /**
     * "Tražim": what this person has asked producers for.
     *
     * @return HasMany<WantedAd, $this>
     */
    public function wantedAds(): HasMany
    {
        return $this->hasMany(WantedAd::class);
    }

    /** @return HasMany<ProducerMessage, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(ProducerMessage::class, 'buyer_id');
    }

    /** @return HasMany<Review, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Producers this user asked to hear from.
     *
     * @return BelongsToMany<Producer, $this>
     */
    public function followedProducers(): BelongsToMany
    {
        return $this->belongsToMany(Producer::class, 'producer_follows', 'user_id', 'producer_id');
    }

    /** @return HasMany<Favorite, $this> */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
