<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Models\User;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\Media;
use App\Support\UniqueSlug;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProducerService
{
    public function __construct(private readonly ProductService $products) {}

    /**
     * Write a change an admin has approved. This goes straight to the model:
     * putting it back through update() would only set it aside as a fresh
     * request.
     */
    public function applyApprovedChange(Producer $producer, string $field, string $value): Producer
    {
        $producer->{$field} = $value;

        if ($field === 'name') {
            $producer->slug = UniqueSlug::for(Producer::class, $value, ignore: $producer);
        }

        $producer->save();

        return $producer;
    }

    /**
     * Pull the fields that need an admin out of an update and record them as
     * requests. An identical request that is already waiting is left alone,
     * so saving the form twice does not queue the same rename twice.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function setAsideChangesNeedingApproval(Producer $producer, array $attributes): array
    {
        foreach (self::FIELDS_NEEDING_APPROVAL as $field) {
            if (! array_key_exists($field, $attributes) || $attributes[$field] === $producer->{$field}) {
                continue;
            }

            $change = ProducerChangeRequest::updateOrCreate(
                [
                    'household_id' => $producer->id,
                    'field' => $field,
                    'status' => ProducerChangeRequest::STATUS_PENDING,
                ],
                [
                    'requested_by' => $producer->user_id,
                    'current_value' => $producer->{$field},
                    'requested_value' => $attributes[$field],
                ],
            );

            // Only for a new or changed request - saving the same form
            // twice asks nothing new.
            if ($change->wasRecentlyCreated || $change->wasChanged('requested_value')) {
                Admins::notify(SiteNotification::forAdmins('change-requested', [
                    'current' => (string) $producer->{$field},
                    'requested' => (string) $attributes[$field],
                ], route('admin.change-requests.index')));
            }

            unset($attributes[$field]);
        }

        return $attributes;
    }

    /**
     * Create a new producer owned by the given user, generating a unique slug from its name.
     * This is the "Postani prodavac" flow (task 1.4): filling in producer details is what
     * grants the 'seller' role, on top of whatever role(s) the user already has.
     *
     * @param  array<string, mixed>  $attributes
     * @param  list<array<string, mixed>>  $products  The wizard's first products, each with an optional 'image' upload.
     */
    public function create(User $user, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null, array $products = []): Producer
    {
        // Photos first, outside the transaction: resizing them holds no
        // locks, and if the database part fails they are removed again
        // instead of staying on disk with nothing pointing at them.
        $stored = [];
        $store = function (?UploadedFile $file, string $directory) use (&$stored): ?string {
            return $file === null ? null : $stored[] = Media::store($file, $directory);
        };

        $coverPath = $store($coverImage, 'producers/covers');
        $logoPath = $store($logo, 'producers/logos');
        $products = array_map(function (array $row) use ($store) {
            $row['image_path'] = $store($row['image'] ?? null, 'products');
            unset($row['image']);

            return $row;
        }, $products);

        try {
            // One step: a producer whose products failed half-way would be a
            // sign-up the owner cannot see through.
            return DB::transaction(function () use ($user, $attributes, $coverPath, $logoPath, $products) {
                // Two sign-ups with the same name at the same moment can pick
                // the same slug; the second one picks again.
                $producer = retry(2, fn () => $user->producers()->create([
                    ...$attributes,
                    'slug' => UniqueSlug::for(Producer::class, $attributes['name']),
                ]), 0, fn ($e) => $e instanceof UniqueConstraintViolationException);

                if (! $user->hasRole('seller')) {
                    $user->assignRole('seller');
                }

                if ($coverPath || $logoPath) {
                    $producer->forceFill(['cover_image_path' => $coverPath, 'logo_path' => $logoPath])->save();
                }

                // The wizard's first products, listed straight away: they are only
                // public once the producer is, so there is nothing to hold back.
                foreach ($products as $row) {
                    $imagePath = $row['image_path'];
                    unset($row['image_path']);

                    $product = $this->products->create($producer, [...$row, 'description' => null, 'status' => 'active']);

                    if ($imagePath) {
                        $product->images()->create(['path' => $imagePath, 'order' => 0]);
                    }
                }

                return $producer;
            });
        } catch (Throwable $e) {
            Media::delete($stored);

            throw $e;
        }
    }

    public const FIELDS_NEEDING_APPROVAL = ['name'];

    /**
     * Update a producer's attributes, regenerating its slug if the name
     * changed.
     *
     * A change to a field that needs approval is recorded as a request and
     * left out of the update, so the producer stays online under the name it
     * was approved with. A producer that is not published yet has nothing to
     * protect, so its owner renames it directly.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Producer $producer, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null): Producer
    {
        if ($producer->status === 'active') {
            $attributes = $this->setAsideChangesNeedingApproval($producer, $attributes);
        }

        if (($attributes['name'] ?? $producer->name) !== $producer->name) {
            $attributes['slug'] = UniqueSlug::for(Producer::class, $attributes['name'], ignore: $producer);
        }

        $producer->fill($attributes);

        $replaced = [];

        foreach (['cover_image_path' => [$coverImage, 'producers/covers'], 'logo_path' => [$logo, 'producers/logos']] as $column => [$file, $directory]) {
            if ($file) {
                $replaced[] = $producer->{$column};
                $producer->{$column} = Media::store($file, $directory);
            }
        }

        $producer->save();

        // Only once the new paths are saved: had the save failed, the page
        // would still be pointing at these.
        Media::delete($replaced);

        return $producer;
    }
}
