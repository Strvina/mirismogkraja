<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProducerService
{
    /**
     * Write a change an admin has approved. This goes straight to the model:
     * putting it back through update() would only set it aside as a fresh
     * request.
     */
    public function applyApprovedChange(Producer $producer, string $field, string $value): Producer
    {
        $producer->{$field} = $value;

        if ($field === 'name') {
            $producer->slug = $this->uniqueSlug($value, ignore: $producer);
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

            ProducerChangeRequest::updateOrCreate(
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
     */
    public function create(User $user, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null): Producer
    {
        $producer = $user->producers()->create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);

        if (! $user->hasRole('seller')) {
            $user->assignRole('seller');
        }

        if ($coverImage) {
            $producer->cover_image_path = $coverImage->store('producers/covers', 'public');
        }

        if ($logo) {
            $producer->logo_path = $logo->store('producers/logos', 'public');
        }

        if ($coverImage || $logo) {
            $producer->save();
        }

        return $producer;
    }

    /**
     * Fields an owner may only ask to change once their producer is public
     * (task 15). Everything else - description, story, contact details,
     * delivery, images, and all of their products - they change themselves,
     * and it takes effect at once.
     *
     * The name is here because it is what an admin approved, what buyers
     * recognise and what the public address is built from.
     *
     * @var list<string>
     */
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
            $attributes['slug'] = $this->uniqueSlug($attributes['name'], ignore: $producer);
        }

        $producer->fill($attributes);

        if ($coverImage) {
            $this->replaceImage($producer, 'cover_image_path', $coverImage, 'producers/covers');
        }

        if ($logo) {
            $this->replaceImage($producer, 'logo_path', $logo, 'producers/logos');
        }

        $producer->save();

        return $producer;
    }

    private function replaceImage(Producer $producer, string $column, UploadedFile $file, string $directory): void
    {
        $oldPath = $producer->{$column};
        $producer->{$column} = $file->store($directory, 'public');

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
    }

    private function uniqueSlug(string $name, ?Producer $ignore = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (
            Producer::where('slug', $slug)
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
