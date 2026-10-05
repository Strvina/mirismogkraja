<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;
use App\Models\Post;
use App\Models\Producer;
use App\Services\PostService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** A producer's own stories and recipes: the list, and writing one. */
class PostController extends Controller
{
    public function index(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('posts/index', [
            'producer' => $producer->only(['id', 'name', 'slug', 'status']),
            'posts' => $producer->posts()
                ->latest()
                ->paginate(30, ['id', 'producer_id', 'type', 'title', 'slug', 'excerpt', 'cover_image_path', 'status', 'published_at', 'created_at']),
        ]);
    }

    public function create(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('posts/create', $this->formProps($producer));
    }

    public function store(StorePostRequest $request, Producer $producer, PostService $posts): RedirectResponse
    {
        if ($producer->posts()->count() >= Post::MAX_PER_PRODUCER) {
            throw ValidationException::withMessages([
                'title' => __('Možete imati najviše :max priča i recepata. Obrišite neku stariju.', ['max' => Post::MAX_PER_PRODUCER]),
            ]);
        }

        $posts->create($producer, $request->safe()->except('cover_image'), $request->file('cover_image'));

        return to_route('producers.posts.index', $producer);
    }

    public function edit(Producer $producer, Post $post): Response
    {
        $this->authorize('update', $producer);
        abort_unless($post->producer_id === $producer->id, 404);

        return Inertia::render('posts/edit', [
            ...$this->formProps($producer),
            'post' => $post->only(['id', 'type', 'title', 'slug', 'body', 'ingredients', 'cover_image_path', 'product_id', 'status']),
        ]);
    }

    public function update(UpdatePostRequest $request, Producer $producer, Post $post, PostService $posts): RedirectResponse
    {
        abort_unless($post->producer_id === $producer->id, 404);

        $posts->update(
            $post,
            $request->safe()->except(['cover_image', 'remove_cover']),
            $request->file('cover_image'),
            $request->boolean('remove_cover'),
        );

        return to_route('producers.posts.index', $producer);
    }

    public function destroy(Producer $producer, Post $post, PostService $posts): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($post->producer_id === $producer->id, 404);

        $posts->delete($post);

        return to_route('producers.posts.index', $producer);
    }

    /** @return array<string, mixed> */
    private function formProps(Producer $producer): array
    {
        return [
            'producer' => $producer->only(['id', 'name', 'slug', 'status']),
            // What a story can be about, or a recipe cooked with.
            'products' => $producer->products()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'limits' => ['bodyMin' => Post::BODY_MIN, 'bodyMax' => Post::BODY_MAX],
        ];
    }
}
