<?php

namespace Database\Seeders;

use App\Models\Boost;
use App\Models\InquiryOutcome;
use App\Models\ProducerSubscription;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Notifications\SiteNotification;
use App\Observers\ActivityLogObserver;
use App\Support\PaymentReference;
use Closure;
use Database\Seeders\LoadTest\BulkInserter;
use Database\Seeders\LoadTest\Vocabulary;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use LogicException;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * The site as it would be with a couple of thousand producers on it, for
 * measuring what the pages cost at that size (docs/performance.md).
 *
 *     php artisan db:seed --class=LoadTestSeeder
 *
 * Never part of `db:seed`, and never on a live site: its accounts all share
 * one password that anyone can read here.
 *
 * The same data on every run - a fixed seed, and nothing left to chance
 * but the day it is run on, which the dates are counted back from. Written
 * with multi-row inserts straight into the tables, so no model event fires:
 * nothing is logged, notified or mailed while it runs.
 *
 * Accounts worth signing in as (password "password"):
 * admin1@loadtest.test; seller1@loadtest.test, who owns the busiest
 * producer; buyer1@loadtest.test, the buyer with the most conversations;
 * buyer6000@loadtest.test, an ordinary one.
 */
class LoadTestSeeder extends Seeder
{
    public const PRODUCERS = 2_000;

    public const PRODUCTS = 50_000;

    public const MESSAGES = 200_000;

    public const REVIEWS = 20_000;

    /** Every account's address ends in this, which is also how a second run recognises the first. */
    public const EMAIL_DOMAIN = 'loadtest.test';

    public const PASSWORD = 'password';

    private const SEED = 20261008;

    private const ADMINS = 3;

    /** Fewer owners than producers: the first hundred run two each. */
    private const OWNERS = 1_900;

    private const BUYERS = 12_000;

    private const FOLLOWS = 30_000;

    private const FAVORITES = 60_000;

    private const NOTIFICATIONS = 60_000;

    private const ACTIVITY_LOGS = 60_000;

    /** Paid memberships: in force, waiting for the payment, and over. */
    private const MEMBERSHIPS = ['running' => 210, 'pending' => 40, 'expired' => 150];

    /** Paid boosts: of a product, of a profile, waiting for the payment, and over. */
    private const BOOSTS = ['product' => 40, 'profile' => 30, 'pending' => 30, 'expired' => 200];

    /** The busiest producers are always public, so the pages measured on them exist. */
    private const ALWAYS_PUBLIC = 25;

    /** An ordinary conversation's longest. */
    private const LONGEST_CONVERSATION = 24;

    /**
     * One conversation in five hundred is a regular customer's: months of
     * messages, so a thread has older pages to page back through.
     */
    private const REGULARS_ONE_IN = 500;

    private const REGULARS_MESSAGES = [60, 400];

    /** A message's place in its conversation is kept in this many bits, beside the conversation's number. */
    private const TURN_BITS = 10;

    /** The demo photograph's path. No file is written: only the rows are measured. */
    private const IMAGE = 'demo/placeholder.jpg';

    private const DAY = 86_400;

    private Randomizer $random;

    /** The moment every date is counted back from. */
    private int $now;

    /** @var array<string, int> The id before the first one written, per table. */
    private array $offset = [];

    /** @var array<string, int> Rows written, per table. */
    private array $written = [];

    /** @var list<array{id: int, name: string, children: list<array{id: int, name: string}>}> */
    private array $categories = [];

    /** @var list<array{name: string, slug: string, status: string, archived: bool, created: int, town: int, specialities: list<int>}> */
    private array $producers = [];

    /** @var list<int> Where in the list of producers the ones the public can see are. */
    private array $publicProducers = [];

    /** @var array<int, list<int>> Product ids by producer position. */
    private array $productsOf = [];

    /** @var list<array{0: int, 1: int}> Published products of public producers: id, producer position. */
    private array $publicProducts = [];

    /** @var list<int> When each buyer signed up. */
    private array $buyerCreated = [];

    /** @var list<array{producer: int, user: int, pattern: string, unreadFrom: int, product: int|null, last: int}> */
    private array $conversations = [];

    public function run(): void
    {
        if (! app()->environment(DatabaseSeeder::DEMO_ENVIRONMENTS)) {
            $this->command?->error('Load-test data is for a local setup only; nothing was seeded.');

            return;
        }

        $this->call(ReferenceDataSeeder::class);

        // Its e-mail addresses are unique in the users table, so a second
        // run would fail on the first insert - after minutes of work on a
        // database that is already full.
        if (User::withTrashed()->where('email', $this->email('admin', 1))->exists()) {
            $this->command?->warn('The load-test data is already in this database; nothing was added.');

            return;
        }

        $started = microtime(true);

        $this->random = new Randomizer(new Mt19937(self::SEED));
        $this->now = now()->startOfMinute()->getTimestamp();

        foreach (['users', 'producers', 'products', 'producer_messages', 'reviews', 'producer_subscriptions', 'boosts'] as $table) {
            $this->offset[$table] = (int) DB::table($table)->max('id');
        }

        $this->loadCategories();
        $this->planProducers();

        $this->seedUsers();
        $this->seedProducers();
        $this->seedProducts();
        $this->seedMessages();
        $this->seedOutcomesAndBlocks();
        $this->seedReviews();
        $this->seedFollowsAndFavorites();
        $this->seedMemberships();
        $this->seedBoosts();
        $this->seedNotifications();
        $this->seedActivityLog();

        $this->command?->table(
            ['Table', 'Rows added'],
            collect($this->written)->map(fn (int $rows, string $table) => [$table, number_format($rows)])->values()->all(),
        );
        $this->command?->info(sprintf('Load-test data seeded in %.1f s.', microtime(true) - $started));
    }

    // ------------------------------------------------------------------ users

    /**
     * The admins, then the owners, then the buyers - in that order, so an
     * account's id follows from its number.
     */
    private function seedUsers(): void
    {
        // One hash for everyone: hashing fourteen thousand passwords would
        // take longer than everything else here together.
        $password = Hash::make(self::PASSWORD);
        $total = self::ADMINS + self::OWNERS + self::BUYERS;

        $this->fill(['users'], $total, function (BulkInserter $users) use ($password) {
            $account = fn (int $index, string $role, int $number, int $created, array $extra = []) => $users->add([
                'id' => $this->userId($index),
                'name' => $this->pick(Vocabulary::FIRST_NAMES).' '.$this->pick(Vocabulary::SURNAMES),
                'email' => $this->email($role, $number),
                'email_verified_at' => $this->at($created),
                'password' => $password,
                'phone' => $this->chance(40) ? $this->phone() : null,
                'city' => $this->chance(50) ? Vocabulary::TOWNS[$this->town()][0] : null,
                'blocked_at' => null,
                'deleted_at' => null,
                'created_at' => $this->at($created),
                'updated_at' => $this->at($created),
                ...$extra,
            ]);

            for ($admin = 0; $admin < self::ADMINS; $admin++) {
                $account($admin, 'admin', $admin + 1, $this->now - 600 * self::DAY);
            }

            for ($owner = 0; $owner < self::OWNERS; $owner++) {
                // Signed up shortly before their first producer was registered.
                $first = min($this->producers[$owner]['created'], $this->producers[$owner + self::OWNERS]['created'] ?? PHP_INT_MAX);
                $account(self::ADMINS + $owner, 'seller', $owner + 1, $first - $this->int(600, 3 * self::DAY));
            }

            for ($buyer = 0; $buyer < self::BUYERS; $buyer++) {
                $created = $this->now - $this->int(self::DAY, 540 * self::DAY);
                $this->buyerCreated[] = $created;

                // A few accounts an admin blocked or their owner deleted; the
                // accounts signed in as for measuring are left alone.
                $state = $buyer < 100 ? 100 : $this->int(1, 200);

                $account(self::ADMINS + self::OWNERS + $buyer, 'buyer', $buyer + 1, $created, match (true) {
                    $state <= 2 => ['blocked_at' => $this->at($created + self::DAY)],
                    $state === 3 => ['deleted_at' => $this->at($created + self::DAY), ...array_intersect_key(User::ANONYMISED, ['name' => 1, 'phone' => 1, 'city' => 1])],
                    default => [],
                });
            }
        });

        $roles = DB::table(config('permission.table_names.roles'))->pluck('id', 'name');
        $type = (new User)->getMorphClass();

        $this->fill([config('permission.table_names.model_has_roles')], $total + self::ADMINS + self::OWNERS, function (BulkInserter $assigned) use ($roles, $type, $total) {
            for ($index = 0; $index < $total; $index++) {
                $names = match (true) {
                    $index < self::ADMINS => ['buyer', 'admin'],
                    $index < self::ADMINS + self::OWNERS => ['buyer', 'seller'],
                    default => ['buyer'],
                };

                foreach ($names as $name) {
                    $assigned->add(['role_id' => $roles[$name], 'model_type' => $type, 'model_id' => $this->userId($index)]);
                }
            }
        });
    }

    // -------------------------------------------------------------- producers

    /**
     * Who the producers are, before anything is written: the owners' sign-up
     * dates and the products both follow from it.
     *
     * A producer's position is also its rank: the first are the busiest -
     * the most products, conversations and reviews.
     */
    private function planProducers(): void
    {
        $taken = DB::table('producers')->pluck('slug')->flip()->all();

        for ($position = 0; $position < self::PRODUCERS; $position++) {
            $town = $this->town();
            $name = $this->pick(Vocabulary::PRODUCER_KINDS).' '.$this->pick(Vocabulary::SURNAMES)
                .($this->chance(30) ? ' '.Vocabulary::TOWNS[$town][0] : '');

            $roll = $position < self::ALWAYS_PUBLIC ? 1 : $this->int(1, 100);
            $status = match (true) {
                $roll <= 91 => 'active',
                $roll <= 96 => 'pending',
                default => 'blocked',
            };
            // Archived with its owner's account: still "active", but soft-deleted.
            $archived = $roll === 91;

            $this->producers[] = [
                'name' => $name,
                'slug' => $this->slug($name, $taken),
                'status' => $status,
                'archived' => $archived,
                // An application still waiting on an admin is a recent one.
                'created' => $this->now - ($status === 'pending' ? $this->int(3600, 14 * self::DAY) : $this->int(2 * self::DAY, 540 * self::DAY)),
                'town' => $town,
                'specialities' => $this->specialities(),
            ];

            if ($status === 'active' && ! $archived) {
                $this->publicProducers[] = $position;
            }
        }
    }

    private function seedProducers(): void
    {
        $founding = (int) DB::table('producers')->max('founding_number');

        $this->fill(['producers', 'producer_images'], self::PRODUCERS, function (BulkInserter $producers, BulkInserter $images) use (&$founding) {
            foreach ($this->producers as $position => $producer) {
                [$town, $lat, $lng] = Vocabulary::TOWNS[$producer['town']];
                $created = $producer['created'];
                $public = $producer['status'] === 'active' && ! $producer['archived'];
                $pinned = $this->chance(70);
                $paused = $public && $position >= self::ALWAYS_PUBLIC && $this->chance(3);
                // The first fifty approved are the founding producers.
                $number = $public && $founding < 50 ? ++$founding : null;

                $producers->add([
                    'id' => $this->producerId($position),
                    'user_id' => $this->ownerOf($position),
                    'name' => $producer['name'],
                    'slug' => $producer['slug'],
                    'description' => $this->sentences(Vocabulary::PRODUCER_SENTENCES, 2),
                    'address' => $this->chance(60) ? 'Ulica '.$this->pick(Vocabulary::SURNAMES).'a '.$this->int(1, 120) : null,
                    // Now and then typed without the diacritics: one place, two spellings.
                    'city' => $this->chance(4) ? Str::ascii($town) : $town,
                    // Somewhere around the town, not all on its main square.
                    'lat' => $pinned ? round($lat + $this->int(-600, 600) / 10_000, 7) : null,
                    'lng' => $pinned ? round($lng + $this->int(-600, 600) / 10_000, 7) : null,
                    'cover_image_path' => $this->chance(80) ? self::IMAGE : null,
                    'logo_path' => $this->chance(70) ? self::IMAGE : null,
                    'status' => $producer['status'],
                    'delivery_methods' => json_encode($this->deliveryMethods()),
                    'phone' => $this->chance(90) ? $this->phone() : null,
                    'contact_email' => $this->chance(60) ? 'kontakt'.($position + 1).'@'.self::EMAIL_DOMAIN : null,
                    'story' => $this->chance(60) ? $this->sentences(Vocabulary::PRODUCER_SENTENCES, 4) : null,
                    'deleted_at' => $producer['archived'] ? $this->at($this->now - $this->int(self::DAY, 60 * self::DAY)) : null,
                    'founding_number' => $number,
                    'founding_joined_at' => $number ? $this->at($created + self::DAY) : null,
                    'verified_at' => $public && $this->chance(30) ? $this->at($created + 5 * self::DAY) : null,
                    'paused_at' => $paused ? $this->at($this->now - $this->int(3600, 10 * self::DAY)) : null,
                    'paused_until' => $paused && $this->chance(50) ? date('Y-m-d', $this->now + $this->int(2, 30) * self::DAY) : null,
                    'pause_note' => $paused ? $this->pick(Vocabulary::PAUSE_NOTES) : null,
                    'created_at' => $this->at($created),
                    'updated_at' => $this->at($created),
                ]);

                for ($order = 0, $count = $this->int(0, 4); $order < $count; $order++) {
                    $images->add([
                        'producer_id' => $this->producerId($position),
                        'path' => self::IMAGE,
                        'caption' => $this->chance(60) ? $this->pick(Vocabulary::GALLERY_CAPTIONS) : null,
                        'order' => $order,
                        'created_at' => $this->at($created),
                        'updated_at' => $this->at($created),
                    ]);
                }
            }
        });
    }

    // --------------------------------------------------------------- products

    /**
     * Written in the order they were added to the site, as real ones are:
     * the newest products are the highest ids, which is what the catalogue's
     * "newest first" reads.
     */
    private function seedProducts(): void
    {
        $times = [];
        $owners = [];

        foreach ($this->productCounts() as $position => $count) {
            $since = $this->producers[$position]['created'];

            for ($each = 0; $each < $count; $each++) {
                $times[] = $this->int($since, $this->now - 60);
                $owners[] = $position;
            }
        }

        asort($times);

        $taken = DB::table('products')->pluck('slug')->flip()->all();
        $id = $this->offset['products'];

        $this->fill(['products', 'product_images'], self::PRODUCTS, function (BulkInserter $products, BulkInserter $images) use ($times, $owners, &$taken, &$id) {
            foreach ($times as $index => $created) {
                $id++;
                $position = $owners[$index];
                $producer = $this->producers[$position];

                $category = $this->categoryFor($producer['specialities']);
                $words = Vocabulary::PRODUCTS[$category['name']] ?? Vocabulary::FALLBACK_PRODUCT;
                $unit = $this->pick($words['units']);
                $base = $this->pick($words['names']);
                $name = match (true) {
                    in_array($unit, ['kom', 'paket'], true) => $base.', '.$this->pick(Vocabulary::PACKAGINGS),
                    $this->chance(40) => $base.', '.$this->pick(Vocabulary::QUALIFIERS),
                    default => $base,
                };

                $roll = $this->int(1, 100);
                $status = match (true) {
                    $roll <= 86 => 'active',
                    $roll <= 93 => 'draft',
                    $roll <= 98 => 'archived',
                    default => Product::STATUS_BLOCKED,
                };

                // One product in four has a season, some of them across the new year.
                $seasonFrom = $this->chance(25) ? $this->int(1, 12) : null;
                $seasonTo = $seasonFrom === null ? null : ($seasonFrom + $this->int(1, 5) - 1) % 12 + 1;

                $products->add([
                    'id' => $id,
                    'producer_id' => $this->producerId($position),
                    'category_id' => $category['id'],
                    'name' => $name,
                    'slug' => $this->slug($name, $taken),
                    'description' => $base.' - '.mb_strtolower($category['name']).', '.Vocabulary::TOWNS[$producer['town']][0].'. '.$this->sentences(Vocabulary::PRODUCT_SENTENCES, $this->int(2, 3)),
                    'price' => number_format($this->int(intdiv($words['price'][0], 10), intdiv($words['price'][1], 10)) * 10, 2, '.', ''),
                    'unit' => $unit,
                    'stock_quantity' => $this->chance(8) ? 0 : $this->int(1, 200),
                    'status' => $status,
                    'created_at' => $this->at($created),
                    'updated_at' => $this->at($created),
                    // A draft has never been public.
                    'published_at' => $status === 'draft' ? null : $this->at($created),
                    'season_from' => $seasonFrom,
                    'season_to' => $seasonTo,
                ]);

                $this->productsOf[$position][] = $id;

                if ($status === 'active' && $producer['status'] === 'active' && ! $producer['archived']) {
                    $this->publicProducts[] = [$id, $position];
                }

                // Most have a photo or two; a few have none, and their card shows the placeholder.
                $photos = [0, 1, 1, 1, 1, 2, 2, 2, 3, 3][$this->int(0, 9)];

                for ($order = 0; $order < $photos; $order++) {
                    $images->add([
                        'product_id' => $id,
                        'path' => self::IMAGE,
                        'order' => $order,
                        'created_at' => $this->at($created),
                        'updated_at' => $this->at($created),
                    ]);
                }
            }
        });
    }

    /**
     * How many products each producer has, adding up to PRODUCTS exactly: a
     * few producers with hundreds, most with a dozen or two, nobody with
     * fewer than three or more than the site allows.
     *
     * @return list<int>
     */
    private function productCounts(): array
    {
        $least = 3;
        $weights = array_map(fn (int $position) => 1 / sqrt($position + 1), range(0, self::PRODUCERS - 1));
        $shared = self::PRODUCTS - $least * self::PRODUCERS;
        $sum = array_sum($weights);

        $counts = array_map(fn (float $weight) => min(Product::MAX_PER_PRODUCER, $least + (int) floor($shared * $weight / $sum)), $weights);

        // What rounding down left over, handed out one each from the top.
        for ($left = self::PRODUCTS - array_sum($counts), $position = 0; $left > 0; $position = ($position + 1) % self::PRODUCERS) {
            if ($counts[$position] < Product::MAX_PER_PRODUCER) {
                $counts[$position]++;
                $left--;
            }
        }

        return $counts;
    }

    // --------------------------------------------------------------- messages

    /**
     * Conversations are planned first and their messages written afterwards
     * in the order they were sent, across all conversations - so the newest
     * message has the highest id, which is what the inbox sorts by.
     */
    private function seedMessages(): void
    {
        $times = [];
        $refs = [];
        $seen = [];

        for ($written = 0; $written < self::MESSAGES;) {
            do {
                // A few producers get most of the mail. Applications still
                // waiting on an admin are not on the site to be written to.
                do {
                    $position = $this->skewed(self::PRODUCERS, 2.5);
                } while ($this->producers[$position]['status'] === 'pending');

                // Mostly plain buyers, a few of them writing to everyone;
                // now and then a producer buying from another.
                $user = $this->chance(10)
                    ? self::ADMINS + $this->int(0, self::OWNERS - 1)
                    : self::ADMINS + self::OWNERS + $this->skewed(self::BUYERS, 2.0);
                $pair = $user * self::PRODUCERS + $position;
            } while (isset($seen[$pair]) || $this->userId($user) === $this->ownerOf($position));

            $seen[$pair] = true;

            $pattern = substr($this->conversationPattern(), 0, self::MESSAGES - $written);
            $length = strlen($pattern);

            // Unread: the last messages, all from the side that wrote last.
            $unanswered = ! str_contains($pattern, 'p');
            $unreadFrom = $this->chance($unanswered ? 60 : 22)
                ? $length - strspn(strrev($pattern), $pattern[$length - 1])
                : $length;

            $sent = $this->conversationTimes($pattern, max(
                $this->now - $this->int(0, self::DAY) - (int) (450 * self::DAY * $this->unit() ** 1.6),
                $this->producers[$position]['created'],
                $this->buyerCreated[$user - self::ADMINS - self::OWNERS] ?? 0,
            ));

            $conversation = count($this->conversations);

            foreach ($sent as $index => $time) {
                $times[] = $time;
                $refs[] = ($conversation << self::TURN_BITS) | $index;
            }

            $this->conversations[] = [
                'producer' => $position,
                'user' => $user,
                'pattern' => $pattern,
                'unreadFrom' => $unreadFrom,
                // Most conversations start from a product's page.
                'product' => $this->chance(60) ? $this->pick($this->productsOf[$position]) : null,
                'last' => end($sent),
            ];

            $written += $length;
        }

        unset($seen);
        asort($times);

        $id = $this->offset['producer_messages'];

        $this->fill(['producer_messages'], self::MESSAGES, function (BulkInserter $messages) use ($times, $refs, &$id) {
            foreach ($times as $index => $time) {
                $conversation = $this->conversations[$refs[$index] >> self::TURN_BITS];
                $turn = $refs[$index] & ((1 << self::TURN_BITS) - 1);
                $fromProducer = $conversation['pattern'][$turn] === 'p';
                $unread = $turn >= $conversation['unreadFrom'];

                $messages->add([
                    'id' => ++$id,
                    'producer_id' => $this->producerId($conversation['producer']),
                    'buyer_id' => $this->userId($conversation['user']),
                    'sender_id' => $fromProducer ? $this->ownerOf($conversation['producer']) : $this->userId($conversation['user']),
                    'body' => $this->pick(match (true) {
                        $turn === 0 => Vocabulary::BUYER_OPENINGS,
                        $turn === 1 && $fromProducer => Vocabulary::PRODUCER_REPLIES,
                        $fromProducer => Vocabulary::PRODUCER_FOLLOW_UPS,
                        default => Vocabulary::BUYER_FOLLOW_UPS,
                    }),
                    'read_at' => $unread ? null : $this->at(min($this->now, $time + $this->int(30, 6 * 3600))),
                    'created_at' => $this->at($time),
                    'updated_at' => $this->at($time),
                    'product_id' => $turn === 0 ? $conversation['product'] : null,
                    // What the "you have a message" e-mail job would have done by now.
                    'emailed_at' => $unread && $time < $this->now - 900 && $this->chance(80) ? $this->at($time + 600) : null,
                ]);
            }
        });
    }

    /**
     * Who writes when, as a string of "b" (buyer) and "p" (producer). One
     * conversation in seven is a question nobody answered; the rest go back
     * and forth, sometimes with two messages in a row from one side.
     */
    private function conversationPattern(): string
    {
        if ($this->chance(15)) {
            return 'b';
        }

        $length = $this->int(1, self::REGULARS_ONE_IN) === 1
            ? $this->int(...self::REGULARS_MESSAGES)
            : min(self::LONGEST_CONVERSATION, 2 + (int) floor(-log(1 - $this->unit()) * 3.6));
        $pattern = 'bp';

        while (strlen($pattern) < $length) {
            $last = $pattern[-1];
            $pattern .= $this->chance(25) ? $last : ($last === 'b' ? 'p' : 'b');
        }

        return $pattern;
    }

    /**
     * When each message of a conversation was sent: an answer takes
     * anything from a minute to three days, a second message from the same
     * side follows within minutes. Nothing is dated after now.
     *
     * @return non-empty-list<int>
     */
    private function conversationTimes(string $pattern, int $start): array
    {
        $times = [$start];

        for ($turn = 1, $length = strlen($pattern); $turn < $length; $turn++) {
            $times[] = $times[$turn - 1] + ($pattern[$turn] === $pattern[$turn - 1]
                ? $this->int(20, 600)
                // Spread evenly over the orders of magnitude: as many answers
                // within the hour as within the day.
                : (int) (60 * exp($this->unit() * log(3 * 24 * 60))));
        }

        $late = end($times) - ($this->now - $this->int(60, 7200));

        return $late > 0 ? array_map(fn (int $time) => $time - $late, $times) : $times;
    }

    /**
     * What some producers noted about how an inquiry ended, and the few
     * conversations one side closed.
     */
    private function seedOutcomesAndBlocks(): void
    {
        $statuses = array_keys(InquiryOutcome::STATUSES);

        $this->fill(['inquiry_outcomes', 'conversation_blocks'], 0, function (BulkInserter $outcomes, BulkInserter $blocks) use ($statuses) {
            foreach ($this->conversations as $conversation) {
                $thread = [
                    'producer_id' => $this->producerId($conversation['producer']),
                    'buyer_id' => $this->userId($conversation['user']),
                ];

                if (str_contains($conversation['pattern'], 'p') && $this->chance(25)) {
                    $outcomes->add([
                        ...$thread,
                        'status' => $statuses[[0, 0, 0, 1, 1, 1, 1, 1, 2, 2][$this->int(0, 9)]] ?? $statuses[0],
                        'product_id' => $conversation['product'],
                        'updated_at' => $this->at(min($this->now, $conversation['last'] + $this->int(600, 5 * self::DAY))),
                    ]);
                }

                if ($this->chance(1)) {
                    $blocks->add([
                        ...$thread,
                        'created_at' => $this->at($conversation['last']),
                        'blocked_by' => $this->chance(70) ? 'producer' : 'buyer',
                    ]);
                }
            }
        });
    }

    // ---------------------------------------------------------------- reviews

    /**
     * Only where the application would have allowed one: the buyer wrote and
     * the producer answered (ReviewPolicy). A conversation is one buyer with
     * one producer, so drawing each conversation at most once also keeps to
     * one review per buyer per producer.
     */
    private function seedReviews(): void
    {
        $eligible = array_keys(array_filter($this->conversations, fn (array $conversation) => str_contains($conversation['pattern'], 'p')));

        if (count($eligible) < self::REVIEWS) {
            throw new LogicException('Too few answered conversations to draw '.self::REVIEWS.' reviews from.');
        }

        $times = [];

        foreach (array_slice($this->random->shuffleArray($eligible), 0, self::REVIEWS) as $conversation) {
            $times[$conversation] = min($this->now - 60, $this->conversations[$conversation]['last'] + $this->int(3600, 20 * self::DAY));
        }

        asort($times);

        $id = $this->offset['reviews'];

        $this->fill(['reviews'], self::REVIEWS, function (BulkInserter $reviews) use ($times, &$id) {
            foreach ($times as $index => $created) {
                $conversation = $this->conversations[$index];
                $rating = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 2, 1][$this->int(0, 19)];

                $roll = $this->int(1, 100);
                $status = match (true) {
                    $roll <= 85 => Review::STATUS_APPROVED,
                    $roll <= 95 => Review::STATUS_PENDING,
                    default => Review::STATUS_REJECTED,
                };
                $approved = $status === Review::STATUS_APPROVED ? min($this->now, $created + $this->int(600, 3 * self::DAY)) : null;
                $replied = $approved !== null && $this->chance(30) ? min($this->now, $approved + $this->int(600, 4 * self::DAY)) : null;

                $reviews->add([
                    'id' => ++$id,
                    'user_id' => $this->userId($conversation['user']),
                    'producer_id' => $this->producerId($conversation['producer']),
                    'rating' => $rating,
                    'comment' => $this->chance(90) ? $this->pick(Vocabulary::REVIEW_COMMENTS[$rating]) : null,
                    'created_at' => $this->at($created),
                    'updated_at' => $this->at($approved ?? $created),
                    'image_path' => $this->chance(5) ? self::IMAGE : null,
                    'status' => $status,
                    'approved_at' => $approved === null ? null : $this->at($approved),
                    'reply' => $replied === null ? null : $this->pick(Vocabulary::REVIEW_REPLIES),
                    'replied_at' => $replied === null ? null : $this->at($replied),
                ]);
            }
        });
    }

    // ------------------------------------------------- follows and favourites

    /**
     * Read by the pages measured: the heart on every product card, the
     * follower count on a producer's page, the home page's ranking. A few
     * buyers save everything they see; most save a handful.
     */
    private function seedFollowsAndFavorites(): void
    {
        $this->fill(['producer_follows'], self::FOLLOWS, function (BulkInserter $follows) {
            $seen = [];

            while (count($seen) < self::FOLLOWS) {
                $buyer = $this->skewed(self::BUYERS, 2.0);
                $position = $this->publicProducers[$this->skewed(count($this->publicProducers), 2.0)];

                if (isset($seen[$pair = $buyer * self::PRODUCERS + $position])) {
                    continue;
                }

                $seen[$pair] = true;

                $follows->add([
                    'user_id' => $this->buyerId($buyer),
                    'producer_id' => $this->producerId($position),
                    'created_at' => $this->at($this->int(max($this->buyerCreated[$buyer], $this->producers[$position]['created']), $this->now)),
                ]);
            }
        });

        $this->fill(['favorites'], self::FAVORITES, function (BulkInserter $favorites) {
            $seen = [];

            while (count($seen) < self::FAVORITES) {
                $buyer = $this->skewed(self::BUYERS, 2.5);
                $product = $this->chance(80);

                [$id, $position] = $product
                    ? $this->publicProducts[$this->skewed(count($this->publicProducts), 1.5)]
                    : [null, $this->publicProducers[$this->skewed(count($this->publicProducers), 2.0)]];
                $id ??= $this->producerId($position);

                if (isset($seen[$key = ($product ? 'product' : 'producer').":{$buyer}:{$id}"])) {
                    continue;
                }

                $seen[$key] = true;

                $favorites->add([
                    'user_id' => $this->buyerId($buyer),
                    'favoritable_type' => $product ? 'product' : 'producer',
                    'favoritable_id' => $id,
                    'created_at' => $this->at($this->int(max($this->buyerCreated[$buyer], $this->producers[$position]['created']), $this->now)),
                ]);
            }
        });
    }

    // ------------------------------------------------------------------- paid

    /**
     * Memberships: the "featured" row and the Premium badge on the public
     * lists come from the ones in force, the admin's queue from the unpaid.
     */
    private function seedMemberships(): void
    {
        $plans = DB::table('subscription_plans')->whereIn('slug', ['premium', 'pro'])->get(['id', 'slug', 'price_rsd', 'duration_days'])->keyBy('slug');

        if ($plans->count() < 2) {
            return;
        }

        $references = $this->paymentReferences();
        $producers = $this->random->shuffleArray($this->publicProducers);
        $id = $this->offset['producer_subscriptions'];

        $this->fill(['producer_subscriptions'], array_sum(self::MEMBERSHIPS), function (BulkInserter $subscriptions) use ($plans, $references, $producers, &$id) {
            $next = 0;

            foreach (self::MEMBERSHIPS as $state => $count) {
                for ($each = 0; $each < $count; $each++) {
                    // A producer has one membership in force at a time; the
                    // list is long enough that nobody comes up twice.
                    $position = $producers[$next++ % count($producers)];
                    $plan = $plans[$this->chance(70) ? 'premium' : 'pro'];

                    $starts = match ($state) {
                        'running' => $this->now - $this->int(self::DAY, ($plan->duration_days - 20) * self::DAY),
                        'expired' => $this->now - $this->int(($plan->duration_days + 5) * self::DAY, ($plan->duration_days + 150) * self::DAY),
                        default => null,
                    };
                    $requested = $starts === null ? $this->now - $this->int(3600, 6 * self::DAY) : $starts - $this->int(3600, 3 * self::DAY);

                    $subscriptions->add([
                        'id' => ++$id,
                        'producer_id' => $this->producerId($position),
                        'subscription_plan_id' => $plan->id,
                        'status' => match ($state) {
                            'running' => ProducerSubscription::STATUS_ACTIVE,
                            'expired' => ProducerSubscription::STATUS_EXPIRED,
                            default => ProducerSubscription::STATUS_PENDING,
                        },
                        'reference' => $references(),
                        'amount_rsd' => $plan->price_rsd,
                        'starts_at' => $starts === null ? null : $this->at($starts),
                        'ends_at' => $starts === null ? null : $this->at($starts + $plan->duration_days * self::DAY),
                        'confirmed_by' => $starts === null ? null : $this->userId(0),
                        'confirmed_at' => $starts === null ? null : $this->at($starts),
                        'created_at' => $this->at($requested),
                        'updated_at' => $this->at($starts ?? $requested),
                    ]);
                }
            }
        });
    }

    /** Boosts: the labelled row above the catalogue and above the directory. */
    private function seedBoosts(): void
    {
        $references = $this->paymentReferences();
        $id = $this->offset['boosts'];

        $this->fill(['boosts'], array_sum(self::BOOSTS), function (BulkInserter $boosts) use ($references, &$id) {
            foreach (self::BOOSTS as $state => $count) {
                for ($each = 0; $each < $count; $each++) {
                    $ofProduct = $state === 'product' || ($state !== 'profile' && $this->chance(60));

                    [$boosted, $position] = $ofProduct
                        ? $this->pick($this->publicProducts)
                        : [null, $this->pick($this->publicProducers)];
                    $boosted ??= $this->producerId($position);

                    $days = 7;
                    $starts = match ($state) {
                        'pending' => null,
                        'expired' => $this->now - $this->int(($days + 1) * self::DAY, 200 * self::DAY),
                        default => $this->now - $this->int(3600, ($days - 1) * self::DAY),
                    };
                    $requested = $starts === null ? $this->now - $this->int(3600, 4 * self::DAY) : $starts - $this->int(3600, 2 * self::DAY);

                    $boosts->add([
                        'id' => ++$id,
                        'producer_id' => $this->producerId($position),
                        'boostable_type' => $ofProduct ? Boost::PRODUCT : Boost::PROFILE,
                        'boostable_id' => $boosted,
                        'status' => match ($state) {
                            'pending' => Boost::STATUS_PENDING,
                            'expired' => Boost::STATUS_EXPIRED,
                            default => Boost::STATUS_ACTIVE,
                        },
                        'reference' => $references(),
                        'amount_rsd' => $ofProduct ? 800 : 1000,
                        'days' => $days,
                        'starts_at' => $starts === null ? null : $this->at($starts),
                        'ends_at' => $starts === null ? null : $this->at($starts + $days * self::DAY),
                        'confirmed_by' => $starts === null ? null : $this->userId(0),
                        'confirmed_at' => $starts === null ? null : $this->at($starts),
                        'created_at' => $this->at($requested),
                        'updated_at' => $this->at($starts ?? $requested),
                    ]);
                }
            }
        });
    }

    /**
     * Slip references nobody has yet, valid under model 97 like the real
     * ones. They are unique across everything paid by slip.
     *
     * @return Closure(): string
     */
    private function paymentReferences(): Closure
    {
        static $taken = null;

        $taken ??= collect(['producer_subscriptions', 'boosts', 'campaign_participants'])
            ->flatMap(fn (string $table) => DB::table($table)->pluck('reference'))
            ->flip()
            ->all();

        return function () use (&$taken): string {
            do {
                $base = (string) $this->int(10_000_000, 99_999_999);
                $reference = PaymentReference::controlDigits($base).'-'.$base;
            } while (isset($taken[$reference]));

            $taken[$reference] = true;

            return $reference;
        };
    }

    // ------------------------------------------------- notifications and log

    /**
     * The bell's count is read on every page of a signed-in visitor, so it
     * is measured against a table of a realistic size too.
     */
    private function seedNotifications(): void
    {
        $type = (new User)->getMorphClass();

        $this->fill(['notifications'], self::NOTIFICATIONS, function (BulkInserter $notifications) use ($type) {
            for ($each = 0; $each < self::NOTIFICATIONS; $each++) {
                $producer = $this->producers[$position = $this->pick($this->publicProducers)];
                $toOwner = $this->chance(50);
                $created = $this->now - $this->int(60, 180 * self::DAY);

                $notifications->add([
                    'id' => $this->uuid(),
                    'type' => SiteNotification::class,
                    'notifiable_type' => $type,
                    'notifiable_id' => $toOwner ? $this->ownerOf($position) : $this->buyerId($this->skewed(self::BUYERS, 2.0)),
                    'data' => json_encode([
                        'type' => $toOwner ? 'review.received' : 'review.published',
                        'params' => ['producer' => $producer['name']],
                        'url' => '/proizvodjac/'.$producer['slug'],
                    ], JSON_UNESCAPED_UNICODE),
                    'read_at' => $this->chance(70) ? $this->at(min($this->now, $created + $this->int(60, 3 * self::DAY))) : null,
                    'created_at' => $this->at($created),
                    'updated_at' => $this->at($created),
                ]);
            }
        });
    }

    /** A year of the audit trail, the table that grows fastest on a live site. */
    private function seedActivityLog(): void
    {
        $times = [];

        for ($each = 0; $each < self::ACTIVITY_LOGS; $each++) {
            $times[] = $this->now - $this->int(60, 360 * self::DAY);
        }

        sort($times);

        $subjects = ActivityLogObserver::subjects();

        $this->fill(['activity_logs'], self::ACTIVITY_LOGS, function (BulkInserter $logs) use ($times, $subjects) {
            foreach ($times as $created) {
                $action = ['created', 'updated', 'updated', 'updated', 'archived', 'deleted'][$this->int(0, 5)];
                $byAdmin = $this->chance(20);

                $logs->add([
                    'user_id' => $byAdmin ? $this->userId($this->int(0, self::ADMINS - 1)) : $this->ownerOf($this->int(0, self::PRODUCERS - 1)),
                    'user_name' => $byAdmin ? 'Admin' : $this->pick(Vocabulary::FIRST_NAMES).' '.$this->pick(Vocabulary::SURNAMES),
                    'action' => $action,
                    // Mostly products: they are what owners change every day.
                    'subject_type' => $this->chance(70) && in_array('Product', $subjects, true) ? 'Product' : $this->pick($subjects),
                    'subject_id' => $this->int(1, self::PRODUCTS),
                    'subject_label' => $this->pick(Vocabulary::PRODUCTS['Ostalo']['names']),
                    'changes' => $action === 'updated' ? json_encode(['price' => ['from' => '500.00', 'to' => '550.00']]) : null,
                    'created_at' => $this->at($created),
                    'updated_at' => $this->at($created),
                ]);
            }
        });
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Writes one step's rows in a single transaction, with a progress bar
     * that counts the first table (0 when nobody knows how many are coming).
     * The tables after the first hold rows that belong to the first one's.
     *
     * @param  non-empty-list<string>  $tables
     * @param  Closure(BulkInserter...): void  $work
     */
    private function fill(array $tables, int $expected, Closure $work): void
    {
        $bar = $this->command?->getOutput()->createProgressBar($expected);
        $bar?->setFormat('  %message% %current% [%bar%] %elapsed:6s%');
        $bar?->setMessage(str_pad(implode(', ', $tables), 38));
        $bar?->start();

        $inserters = [];

        foreach ($tables as $index => $table) {
            $inserters[] = $index === 0
                ? new BulkInserter($table, $bar ? $bar->advance(...) : null)
                : (new BulkInserter($table))->after($inserters[0]);
        }

        DB::transaction(function () use ($work, $inserters) {
            $work(...$inserters);

            foreach ($inserters as $inserter) {
                $inserter->flush();
            }
        });

        foreach ($tables as $index => $table) {
            $this->written[$table] = ($this->written[$table] ?? 0) + $inserters[$index]->flush();
        }

        $bar?->finish();
        $this->command?->newLine();
    }

    /** The categories of the reference seeder, each general one with its subcategories. */
    private function loadCategories(): void
    {
        $all = DB::table('categories')->orderBy('id')->get(['id', 'name', 'parent_id']);

        $this->categories = $all->whereNull('parent_id')->map(fn (object $root) => [
            'id' => (int) $root->id,
            'name' => (string) $root->name,
            'children' => $all->where('parent_id', $root->id)->map(fn (object $child) => ['id' => (int) $child->id, 'name' => (string) $child->name])->values()->all(),
        ])->values()->all();

        if ($this->categories === []) {
            throw new LogicException('There are no categories to file products under.');
        }
    }

    /**
     * The one to three general categories a producer sells in: a beekeeper
     * does not also sell bacon.
     *
     * @return non-empty-list<int> Positions in $categories.
     */
    private function specialities(): array
    {
        $chosen = [];

        for ($each = 0, $count = [1, 1, 2, 2, 2, 3][$this->int(0, 5)]; $each < $count; $each++) {
            $chosen[$this->int(0, count($this->categories) - 1)] = true;
        }

        return array_keys($chosen);
    }

    /**
     * Where one of a producer's products is filed: in a subcategory when
     * the general category has them, more often than not.
     *
     * @param  non-empty-list<int>  $specialities
     * @return array{id: int, name: string}
     */
    private function categoryFor(array $specialities): array
    {
        $root = $this->categories[$this->pick($specialities)];

        return $root['children'] !== [] && $this->chance(70) ? $this->pick($root['children']) : $root;
    }

    /**
     * A slug nobody has, numbered the way the application numbers them:
     * "ajvar-blagi", "ajvar-blagi-1", "ajvar-blagi-2".
     *
     * @param  array<string, mixed>  $taken
     */
    private function slug(string $name, array &$taken): string
    {
        static $next = [];

        $base = Str::slug($name);
        $slug = $base;

        while (isset($taken[$slug])) {
            $next[$base] = ($next[$base] ?? 0) + 1;
            $slug = $base.'-'.$next[$base];
        }

        $taken[$slug] = true;

        return $slug;
    }

    /** @return list<string> */
    private function deliveryMethods(): array
    {
        return [
            ['licna_dostava', 'preuzimanje'],
            ['kurirska_sluzba'],
            ['kurirska_sluzba', 'preuzimanje'],
            ['preuzimanje'],
            ['licna_dostava', 'kurirska_sluzba', 'preuzimanje'],
            ['preuzimanje', 'Dostava autobusom na liniji Niš-Beograd'],
        ][$this->int(0, 5)];
    }

    /** @param  list<string>  $pool */
    private function sentences(array $pool, int $count): string
    {
        return implode(' ', array_map(fn () => $this->pick($pool), range(1, $count)));
    }

    /** A position in Vocabulary::TOWNS, the larger towns more often. */
    private function town(): int
    {
        static $weighted = null;

        $weighted ??= array_merge(...array_map(
            fn (array $town, int $position) => array_fill(0, $town[3], $position),
            Vocabulary::TOWNS,
            array_keys(Vocabulary::TOWNS),
        ));

        return $this->pick($weighted);
    }

    private function phone(): string
    {
        return sprintf('+381 6%d %03d %04d', $this->int(0, 9), $this->int(0, 999), $this->int(0, 9999));
    }

    private function uuid(): string
    {
        return (string) preg_replace('/^(.{8})(.{4})(.{4})(.{4})(.{12})$/', '$1-$2-$3-$4-$5', bin2hex($this->random->getBytes(16)));
    }

    private function email(string $role, int $number): string
    {
        return $role.$number.'@'.self::EMAIL_DOMAIN;
    }

    private function userId(int $index): int
    {
        return $this->offset['users'] + 1 + $index;
    }

    private function buyerId(int $buyer): int
    {
        return $this->userId(self::ADMINS + self::OWNERS + $buyer);
    }

    private function producerId(int $position): int
    {
        return $this->offset['producers'] + 1 + $position;
    }

    /** The account that owns the producer at this position. */
    private function ownerOf(int $position): int
    {
        return $this->userId(self::ADMINS + $position % self::OWNERS);
    }

    private function at(int $timestamp): string
    {
        return date('Y-m-d H:i:s', $timestamp);
    }

    private function int(int $min, int $max): int
    {
        return $this->random->getInt($min, $max);
    }

    private function chance(int $percent): bool
    {
        return $this->random->getInt(1, 100) <= $percent;
    }

    /** A number in [0, 1). */
    private function unit(): float
    {
        return $this->random->getInt(0, 999_999_999) / 1_000_000_000;
    }

    /**
     * A position in a list of $size, the first ones far more often than the
     * last: the higher the power, the more of everything the top gets.
     */
    private function skewed(int $size, float $power): int
    {
        return min($size - 1, (int) floor($size * $this->unit() ** $power));
    }

    /**
     * @template T
     *
     * @param  non-empty-list<T>  $list
     * @return T
     */
    private function pick(array $list): mixed
    {
        return $list[$this->random->getInt(0, count($list) - 1)];
    }
}
