<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProducerService
{
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
     * Update a producer's attributes, regenerating its slug if the name changed.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Producer $producer, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null): Producer
    {
        if ($attributes['name'] !== $producer->name) {
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
