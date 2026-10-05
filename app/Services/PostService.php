<?php

namespace App\Services;

use App\Jobs\NotifyFollowersOfPost;
use App\Models\Post;
use App\Models\Producer;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\Media;
use App\Support\UniqueSlug;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;

/** Writing and rewriting a producer's stories and recipes. */
class PostService
{
    /** @param  array<string, mixed>  $attributes */
    public function create(Producer $producer, array $attributes, ?UploadedFile $cover): Post
    {
        $attributes = $this->prepared($attributes);

        if ($cover) {
            $attributes['cover_image_path'] = Media::store($cover, 'posts');
        }

        // Two posts with the same title at the same moment can pick the
        // same slug; the second one picks again.
        $post = retry(2, fn () => $producer->posts()->create([
            ...$attributes,
            'slug' => UniqueSlug::for(Post::class, $attributes['title']),
        ]), 0, fn ($e) => $e instanceof UniqueConstraintViolationException);

        $this->announceIfPublished($post);

        return $post;
    }

    /** @param  array<string, mixed>  $attributes */
    public function update(Post $post, array $attributes, ?UploadedFile $cover, bool $removeCover = false): Post
    {
        $attributes = $this->prepared($attributes);

        if ($attributes['title'] !== $post->title) {
            $attributes['slug'] = UniqueSlug::for(Post::class, $attributes['title'], ignore: $post);
        }

        $previousCover = $post->cover_image_path;

        if ($cover) {
            $attributes['cover_image_path'] = Media::store($cover, 'posts');
        } elseif ($removeCover) {
            $attributes['cover_image_path'] = null;
        }

        $post->update($attributes);

        if ($previousCover !== $post->cover_image_path) {
            Media::delete($previousCover);
        }

        $this->announceIfPublished($post);

        return $post;
    }

    public function delete(Post $post): void
    {
        Media::delete($post->cover_image_path);
        $post->delete();
    }

    /**
     * The excerpt is always the opening of the text, and only a recipe has
     * ingredients - a story saved with a list left over from before it
     * changed type would otherwise carry it around unseen.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function prepared(array $attributes): array
    {
        $attributes['excerpt'] = Post::excerptFrom($attributes['body']);

        if ($attributes['type'] !== Post::TYPE_RECIPE) {
            $attributes['ingredients'] = null;
        }

        return $attributes;
    }

    /**
     * The first time a post is public: followers hear about it, and so do
     * the admins, who read what goes up under the site's name. A post taken
     * down and put back has already been announced.
     */
    private function announceIfPublished(Post $post): void
    {
        if ($post->published_at !== null || $post->status !== Post::STATUS_PUBLISHED) {
            return;
        }

        $post->forceFill(['published_at' => now()])->saveQuietly();

        // Written before the producer was approved: it goes up with their
        // page, and there is nobody following them to tell yet.
        if (! $post->isPubliclyVisible()) {
            return;
        }

        NotifyFollowersOfPost::dispatch($post)->afterResponse();

        Admins::notify(SiteNotification::forAdmins('post-published', [
            'producer' => $post->producer->name,
            'title' => $post->title,
        ], route('admin.posts.index')));
    }
}
