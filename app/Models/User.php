<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

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
        'blocked_at',
        'notify_messages_by_email',
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

    public function producers(): HasMany
    {
        return $this->hasMany(Producer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ProducerMessage::class, 'buyer_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Producers this user asked to hear from. */
    public function followedProducers(): BelongsToMany
    {
        return $this->belongsToMany(Producer::class, 'producer_follows', 'user_id', 'producer_id');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
