<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Notifications\WeeklyDigest;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Once a week, tells people what the producers they follow have added: new
 * products, new stories and recipes. Weekly (routes/console.php).
 *
 * Only to someone who follows a producer that has something new - following
 * is the request to hear from them - and never an empty mail. What is new
 * is read once for everyone, not per person: two queries for the week, then
 * each reader's part is picked out of it.
 */
class SendWeeklyDigest extends Command
{
    protected $signature = 'digest:send-weekly';

    protected $description = 'E-mail people what the producers they follow added this week';

    /** How far back "new" reaches, and the least time between two mails to one person. */
    public const DAYS = 7;

    /** New items read per run. A week that adds more than this is listed up to here. */
    private const ITEMS_READ = 5000;

    public function handle(): int
    {
        $news = $this->news();
        $sent = 0;

        if ($news->isNotEmpty()) {
            User::query()
                ->where('notify_weekly_digest', true)
                ->whereNotNull('email_verified_at')
                ->whereNull('blocked_at')
                // A day short of the week, so a run that starts a few
                // minutes earlier than last week's still counts as the next.
                ->where(fn ($query) => $query->whereNull('digest_sent_at')->orWhere('digest_sent_at', '<', now()->subDays(self::DAYS - 1)))
                ->whereHas('followedProducers', fn ($query) => $query->whereKey($news->keys()))
                ->with(['followedProducers' => fn ($query) => $query->whereKey($news->keys())->select('producers.id')])
                ->chunkById(200, function ($users) use ($news, &$sent) {
                    foreach ($users as $user) {
                        $sent += (int) $this->mail($user, $news);
                    }
                });
        }

        $this->info("Sent {$sent} digest(s).");

        return self::SUCCESS;
    }

    /** @param  Collection<int, array<string, mixed>>  $news */
    private function mail(User $user, Collection $news): bool
    {
        $theirs = $user->followedProducers
            ->map(fn (Producer $producer) => $news->get($producer->id))
            ->filter()
            // The producer with the most to show first.
            ->sortByDesc(fn (array $producer) => count($producer['products']) + count($producer['posts']))
            ->values();

        try {
            $user->notify(new WeeklyDigest($theirs->all()));
        } catch (Throwable $e) {
            // Left unmarked, so next week's run - or a rerun - tries again.
            report($e);

            return false;
        }

        $user->forceFill(['digest_sent_at' => now()])->saveQuietly();

        return true;
    }

    /**
     * What each producer published in the last week, by producer id. Only
     * what is public now: a product hidden since is not news.
     *
     * @return Collection<int, array{name: string, url: string, products: list<array{name: string, url: string}>, posts: list<array{name: string, url: string}>}>
     */
    private function news(): Collection
    {
        $since = now()->subDays(self::DAYS);

        $products = Product::query()->published()
            ->where('published_at', '>=', $since)
            ->orderByDesc('published_at')
            ->limit(self::ITEMS_READ)
            ->get(['id', 'producer_id', 'name', 'slug'])
            ->groupBy('producer_id');

        $posts = Post::published()
            ->where('published_at', '>=', $since)
            ->orderByDesc('published_at')
            ->limit(self::ITEMS_READ)
            ->get(['id', 'producer_id', 'title', 'slug'])
            ->groupBy('producer_id');

        return Producer::published()
            ->whereKey($products->keys()->merge($posts->keys())->unique())
            ->get(['id', 'name', 'slug'])
            ->keyBy('id')
            ->map(fn (Producer $producer) => [
                'name' => $producer->name,
                'url' => route('marketplace.producers.show', $producer->slug),
                'products' => $products->get($producer->id, collect())
                    ->map(fn (Product $product) => ['name' => $product->name, 'url' => route('marketplace.products.show', $product->slug)])
                    ->values()->all(),
                'posts' => $posts->get($producer->id, collect())
                    ->map(fn (Post $post) => ['name' => $post->title, 'url' => route('marketplace.posts.show', $post->slug)])
                    ->values()->all(),
            ]);
    }
}
