<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Notifications\SiteNotification;
use App\Services\PostService;
use App\Support\Search;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Stories and recipes go up without waiting, like products; this is where
 * an admin reads them afterwards and takes down what should not be there.
 */
class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $search = Search::clean($request->string('q')->toString());

        return Inertia::render('admin/posts/index', [
            'posts' => Post::query()
                ->with('producer:id,name,slug')
                ->when(in_array($status, Post::STATUSES, true), fn ($query) => $query->where('status', $status))
                ->when($search !== '', fn ($query) => $query->where('title', 'like', '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%'))
                ->latest()
                ->paginate(30, ['id', 'producer_id', 'type', 'title', 'slug', 'excerpt', 'status', 'published_at', 'created_at'])
                ->withQueryString(),
            'filters' => ['status' => in_array($status, Post::STATUSES, true) ? $status : null, 'q' => $search !== '' ? $search : null],
        ]);
    }

    /** Take a post down, or put a blocked one back up. */
    public function updateStatus(Request $request, Post $post): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([Post::STATUS_PUBLISHED, Post::STATUS_BLOCKED])]]);

        $previous = $post->status;

        // "Put back" undoes a block; it is not a way to publish an author's draft for them.
        abort_if($data['status'] === Post::STATUS_PUBLISHED && $previous !== Post::STATUS_BLOCKED, 422);

        $post->update($data);

        if ($previous !== Post::STATUS_BLOCKED && $post->status === Post::STATUS_BLOCKED) {
            $post->producer?->user?->notify(SiteNotification::postBlocked(
                $post->title,
                route('producers.posts.index', $post->producer_id),
            ));
        }

        return back();
    }

    public function destroy(Post $post, PostService $posts): RedirectResponse
    {
        $posts->delete($post);

        return back();
    }
}
