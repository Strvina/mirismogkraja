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
 * products, new stories and recipes. Run on three mornings in a row
 * (routes/console.php): each sends to those who have not had this week's
 * yet, up to a limit, so a large audience is spread over the days instead of
 * using up a mail plan's daily allowance in one go.
 *
 * Only to someone who follows a producer that has something new - following
 * is the request to hear from them - and never an empty mail. What is new
 * is read once for everyone, not per person: two queries for the week, then
 * each reader's part is picked out of it.
 *
 * @phpstan-type NewsItem array{name: string, url: string, at: int}
 * @phpstan-type ProducerNews array{name: string, url: string, products: array<int, NewsItem>, posts: array<int, NewsItem>}
 */
class SendWeeklyDigest extends Command
{
    protected $signature = 'digest:send-weekly';

    protected $description = 'E-mail people what the producers they follow added this week';

    /** How far back "new" reaches. */
    public const DAYS = 7;

    /**
     * The least time between two mails to one person. Longer than the three
     * mornings the command runs on, so nobody is mailed twice in one week;
     * shorter than a week, so someone served on the last morning is due
     * again on the first one of the next.
     */
    public const MIN_GAP_DAYS = 4;

    /** New items read per run. A week that adds more than this is listed up to here. */
    private const ITEMS_READ = 5000;

    public function handle(): int
    {
        $news = $this->news();
        $sent = 0;
        $limit = max(1, (int) config('platform.digest.max_per_run'));

        if ($news->isNotEmpty()) {
            User::query()
                ->where('notify_weekly_digest', true)
                ->whereNotNull('email_verified_at')
                ->whereNull('blocked_at')
                ->where(fn ($query) => $query->whereNull('digest_sent_at')->orWhere('digest_sent_at', '<', now()->subDays(self::MIN_GAP_DAYS)))
                ->whereHas('followedProducers', fn ($query) => $query->whereKey($news->keys()))
                ->with(['followedProducers' => fn ($query) => $query->whereKey($news->keys())->select('producers.id')])
                ->chunkById(200, function ($users) use ($news, $limit, &$sent) {
                    foreach ($users as $user) {
                        if ($sent >= $limit) {
                            // The rest get theirs on the next run.
                            return false;
                        }

                        $sent += (int) $this->mail($user, $news);
                    }
                });
        }

        $this->info("Sent {$sent} digest(s).");

        return self::SUCCESS;
    }

    /** @param  Collection<array-key, ProducerNews>  $news */
    private function mail(User $user, Collection $news): bool
    {
        // Only what they have not been told: someone mailed on Saturday is
        // due again on Thursday, and the two weeks looked back over overlap.
        $toldUntil = $user->digest_sent_at?->getTimestamp() ?? 0;
        $unseen = fn (array $items) => array_values(array_map(
            fn (array $item) => ['name' => $item['name'], 'url' => $item['url']],
            array_filter($items, fn (array $item) => $item['at'] > $toldUntil),
        ));

        $theirs = $user->followedProducers
            ->map(fn (Producer $producer) => $news->get($producer->id))
            ->filter()
            ->map(fn (array $producer) => [...$producer, 'products' => $unseen($producer['products']), 'posts' => $unseen($producer['posts'])])
            ->filter(fn (array $producer) => $producer['products'] !== [] || $producer['posts'] !== [])
            // The producer with the most to show first.
            ->sortByDesc(fn (array $producer) => count($producer['products']) + count($producer['posts']))
            ->values();

        // Nothing since their last one: no mail, and never an empty one.
        if ($theirs->isEmpty()) {
            return false;
        }

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
     * What each producer published in the last week, by producer id, each
     * item with when ("at"). Only what is public now: a product hidden since
     * is not news.
     *
     * @return Collection<array-key, ProducerNews>
     */
    private function news(): Collection
    {
        $since = now()->subDays(self::DAYS);

        $products = Product::query()->published()
            ->where('published_at', '>=', $since)
            ->orderByDesc('published_at')
            ->limit(self::ITEMS_READ)
            ->get(['id', 'producer_id', 'name', 'slug', 'published_at'])
            ->groupBy('producer_id');

        $posts = Post::published()
            ->where('published_at', '>=', $since)
            ->orderByDesc('published_at')
            ->limit(self::ITEMS_READ)
            ->get(['id', 'producer_id', 'title', 'slug', 'published_at'])
            ->groupBy('producer_id');

        return Producer::published()
            ->whereKey($products->keys()->merge($posts->keys())->unique())
            ->get(['id', 'name', 'slug'])
            ->keyBy('id')
            ->map(fn (Producer $producer) => [
                'name' => $producer->name,
                'url' => route('marketplace.producers.show', $producer->slug),
                'products' => $products->get($producer->id, collect())
                    ->map(fn (Product $product) => ['name' => $product->name, 'url' => route('marketplace.products.show', $product->slug), 'at' => $product->published_at->getTimestamp()])
                    ->values()->all(),
                'posts' => $posts->get($producer->id, collect())
                    ->map(fn (Post $post) => ['name' => $post->title, 'url' => route('marketplace.posts.show', $post->slug), 'at' => $post->published_at->getTimestamp()])
                    ->values()->all(),
            ]);
    }
}
