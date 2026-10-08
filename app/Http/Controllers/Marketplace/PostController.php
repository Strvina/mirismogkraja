<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Producer;
use App\Models\Report;
use App\Support\PageMeta;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Stories and recipes, as the public reads them. */
class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $type = Post::TYPE_FILTERS[$request->string('vrsta')->toString()] ?? null;
        // "Sve priče ovog proizvođača", from the producer's page.
        $producer = $request->filled('proizvodjac')
            ? Producer::published()->where('slug', $request->string('proizvodjac')->toString())->first(['id', 'name', 'slug'])
            : null;

        return Inertia::render('marketplace/posts/index', [
            'meta' => PageMeta::make(
                __('Priče i recepti | Vrelina juga'),
                __('Kako nastaju domaći proizvodi sa juga Srbije i šta se od njih sprema — iz prve ruke, od ljudi koji ih prave.'),
            ),
            'posts' => Post::published()
                ->when($type, fn ($query) => $query->where('type', $type))
                ->when($producer, fn ($query) => $query->where('producer_id', $producer->id))
                ->with('producer:id,name,slug,city,logo_path')
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->paginate(12, Post::CARD_COLUMNS)
                ->withQueryString(),
            'filters' => [
                'vrsta' => $type ? $request->string('vrsta')->toString() : null,
                'producer' => $producer?->only(['name', 'slug']),
            ],
        ]);
    }

    public function show(Request $request, Post $post): Response
    {
        $post->load(['producer:id,user_id,name,slug,city,logo_path,status,description', 'product' => fn ($product) => $product
            ->select(['id', 'producer_id', 'name', 'slug', 'price', 'unit', 'status'])
            ->with('images:id,product_id,path,order')]);

        // The author reads their own draft as it will look, and an admin
        // reads what they are deciding about; nobody else reaches a post
        // that is not published.
        $user = $request->user();
        $mayPreview = $post->producer !== null && $user !== null && ($user->id === $post->producer->user_id || $user->hasRole('admin'));
        abort_unless($post->isPubliclyVisible() || $mayPreview, 404);

        return Inertia::render('marketplace/posts/show', [
            'post' => [
                ...$post->only(['id', 'type', 'title', 'slug', 'body', 'cover_image_path', 'published_at', 'status']),
                'ingredients' => $post->ingredientList(),
            ],
            'producer' => $post->producer->only(['id', 'name', 'slug', 'city', 'logo_path', 'description']),
            // Only while the product is itself on sale.
            'product' => $post->product?->status === 'active' ? [
                ...$post->product->only(['id', 'name', 'slug', 'price', 'unit']),
                'image' => $post->product->images->first()?->path,
            ] : null,
            'more' => Post::published()
                ->where('producer_id', $post->producer_id)
                ->whereKeyNot($post->id)
                ->orderByDesc('published_at')
                ->limit(3)
                ->get(Post::CARD_COLUMNS),
            'isPreview' => ! $post->isPubliclyVisible(),
            // Anyone signed in but the author, and only what is public.
            'canReport' => $user !== null && $user->id !== $post->producer->user_id && $post->isPubliclyVisible(),
            'reportReasons' => array_map(__(...), Report::REASONS),
            'meta' => [
                ...PageMeta::make("{$post->title} — {$post->producer->name}", $post->excerpt, $post->cover_image_path ?? $post->producer->logo_path, 'article'),
                'structured' => PageMeta::post($post),
            ],
        ]);
    }
}
