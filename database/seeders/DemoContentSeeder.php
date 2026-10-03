<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WeeklyPick;
use App\Notifications\SiteNotification;
use App\Services\BoostService;
use App\Services\FoundingProducerService;
use App\Services\SubscriptionService;
use App\Support\Media;
use App\Support\PaymentReference;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoContentSeeder extends Seeder
{
    /**
     * Demo rows all point at this one real file on the public disk, so seeded
     * images actually render instead of 404-ing as invented paths would.
     * Replaced per-producer once they upload their own.
     */
    private const DEMO_IMAGE = 'demo/placeholder.jpg';

    /**
     * Each entry is a producer specialised in a couple of real categories, so
     * the catalog reads as plausible instead of as random name/category pairs.
     * Declared as a constant because the e-mail addresses double as the marker
     * that tells run() the demo data is already in place.
     *
     * @var list<array<string, mixed>>
     */
    private const PRODUCERS = [
        ['name' => 'Domaćinstvo Nićić', 'owner' => 'Dragan Nićić', 'email' => 'nicic@example.com', 'city' => 'Leskovac', 'lat' => 42.9981, 'lng' => 21.9461, 'delivery' => ['licna_dostava', 'preuzimanje'], 'categories' => ['Meso i suhomesnato', 'Rakija i vino']],
        ['name' => 'Mlekara Zapis', 'owner' => 'Vesna Zapis', 'email' => 'zapis@example.com', 'city' => 'Zlatibor', 'lat' => 43.7291, 'lng' => 19.6982, 'delivery' => ['kurirska_sluzba'], 'categories' => ['Mlečni proizvodi', 'Jaja']],
        ['name' => 'Pčelinjak Medovina', 'owner' => 'Slobodan Ilić', 'email' => 'medovina@example.com', 'city' => 'Niš', 'lat' => 43.3209, 'lng' => 21.8958, 'delivery' => ['kurirska_sluzba', 'preuzimanje'], 'categories' => ['Med i pčelinji proizvodi', 'Ostalo']],
        // One producer with wording of their own, to exercise custom methods.
        ['name' => 'Voćarstvo Južni Sad', 'owner' => 'Zoran Stanković', 'email' => 'juznisad@example.com', 'city' => 'Aleksinac', 'lat' => 43.5417, 'lng' => 21.7078, 'delivery' => ['preuzimanje', 'Dostava autobusom na liniji Niš–Beograd'], 'categories' => ['Voće', 'Rakija i vino']],
        ['name' => 'Bašta Ivanovića', 'owner' => 'Snežana Ivanović', 'email' => 'basta@example.com', 'city' => 'Vranje', 'lat' => 42.5514, 'lng' => 21.9003, 'delivery' => ['licna_dostava'], 'categories' => ['Povrće', 'Žitarice']],
        ['name' => 'Salaš Kraljević', 'owner' => 'Đorđe Kraljević', 'email' => 'salas@example.com', 'city' => 'Novi Sad', 'lat' => 45.2671, 'lng' => 19.8335, 'delivery' => ['licna_dostava', 'kurirska_sluzba', 'preuzimanje'], 'categories' => ['Žitarice', 'Jaja', 'Meso i suhomesnato']],
    ];

    /**
     * Predictable buyer addresses (password: "password"), so the demo accounts
     * are easy to log into while testing.
     *
     * @var array<string, string>
     */
    private const BUYERS = [
        'Marko Marković' => 'marko@example.com',
        'Jovana Jovanović' => 'jovana@example.com',
        'Stefan Stefanović' => 'stefan@example.com',
        'Ana Anić' => 'ana@example.com',
        'Nikola Nikolić' => 'nikola@example.com',
        'Milica Milić' => 'milica@example.com',
    ];

    /**
     * Realistic demo data (task 1): an admin account, a handful of seller
     * producers each specialised in a couple of categories with priced
     * products and images, plain buyer accounts, product inquiries in every
     * state a thread can be in, and reviews with a realistic rating spread -
     * so every screen has real content to demo instead of being empty.
     */
    public function run(): void
    {
        // Run directly (db:seed --class=...) it would skip DatabaseSeeder's
        // check - so it checks for itself. Its accounts have passwords
        // anyone can read here, and it needs Faker, which a production
        // install (composer install --no-dev) does not have.
        if (! app()->environment(DatabaseSeeder::DEMO_ENVIRONMENTS)) {
            $this->command?->error('Demo content is for a local setup only; nothing was seeded.');

            return;
        }

        $this->copyDemoImage();
        $this->seedAdminUser();

        // The demo dataset uses fixed e-mail addresses, which are unique in
        // the users table. Seeding it twice would fail on the first insert, so
        // repeated `db:seed` runs on a local database stop here instead.
        if (User::withTrashed()->whereIn('email', array_column(self::PRODUCERS, 'email'))->exists()) {
            return;
        }

        $producers = $this->seedProducersWithProducts();
        $buyers = $this->seedBuyers();

        $this->seedConversations($producers, $buyers);
        $this->seedReviews($producers, $buyers);
        $this->seedNotifications($producers);
        $this->seedMonetisation($producers);
        $this->seedStatistics($producers);
    }

    /**
     * Something in every paid feature, so each one can be seen working: the
     * first three are founding producers (and so on a free Premium year), one
     * pays for Pro, one profile and one product are boosted, there is a
     * producer of the week and a campaign under way - and one payment of
     * each kind waits, so the admin dashboard has something to do.
     *
     * @param  list<Producer>  $producers
     */
    private function seedMonetisation(array $producers): void
    {
        $admin = User::where('email', 'admin@gmail.com')->firstOrFail();
        $founding = app(FoundingProducerService::class);
        $subscriptions = app(SubscriptionService::class);
        $boosts = app(BoostService::class);

        foreach (array_slice($producers, 0, 3) as $producer) {
            $founding->claimNumberFor($producer);
        }

        $pro = SubscriptionPlan::where('slug', 'pro')->first();
        if ($pro) {
            $subscriptions->confirmPayment($subscriptions->request($producers[3], $pro), $admin->id);
            $subscriptions->request($producers[5], $pro);
        }

        $boosts->confirm($boosts->request($producers[4], $producers[4]), $admin->id);
        $boosted = $producers[5]->products()->where('status', 'active')->first();
        if ($boosted) {
            $boosts->confirm($boosts->request($producers[5], $boosted), $admin->id);
        }
        $boosts->request($producers[1], $producers[1]);

        WeeklyPick::create([
            'household_id' => $producers[1]->id,
            'product_id' => $producers[1]->products()->where('status', 'active')->value('id'),
            'starts_on' => WeeklyPick::weekOf()->toDateString(),
            'created_by' => $admin->id,
        ]);
        // What the admin page would have sent, so the bell matches the data.
        $producers[1]->user->notify(SiteNotification::weeklyPick(
            $producers[1]->name,
            WeeklyPick::weekOf(),
            route('marketplace.producers.show', $producers[1]->slug),
        ));

        $campaign = Campaign::create([
            'name' => 'Ajvar sezona',
            'slug' => 'ajvar-sezona',
            'description' => 'Paprika je stigla na pijace, a ajvar se peče po dvorištima. Proizvođači koji ga prave po starom receptu.',
            'starts_on' => today()->subWeek(),
            'ends_on' => today()->addWeeks(3),
            'price_rsd' => 2490,
            'is_active' => true,
        ]);

        foreach ([$producers[0], $producers[4]] as $producer) {
            CampaignParticipant::create([
                'campaign_id' => $campaign->id,
                'household_id' => $producer->id,
                'status' => CampaignParticipant::STATUS_ACTIVE,
                'reference' => PaymentReference::generate(),
                'amount_rsd' => $campaign->price_rsd,
                'confirmed_by' => $admin->id,
                'confirmed_at' => now(),
            ]);

            $producer->user->notify(SiteNotification::campaignJoined($campaign->name, route('campaigns.show', $campaign->slug)));
        }

        CampaignParticipant::create([
            'campaign_id' => $campaign->id,
            'household_id' => $producers[3]->id,
            'status' => CampaignParticipant::STATUS_PENDING,
            'reference' => PaymentReference::generate(),
            'amount_rsd' => $campaign->price_rsd,
        ]);
    }

    /**
     * Thirty days of views and contact clicks, so the statistics page has a
     * chart to draw. Written as the daily counters the site itself keeps.
     *
     * @param  list<Producer>  $producers
     */
    private function seedStatistics(array $producers): void
    {
        $rows = [];

        foreach ($producers as $producer) {
            $products = $producer->products()->where('status', 'active')->pluck('id');

            foreach (range(0, 29) as $daysAgo) {
                $date = today()->subDays($daysAgo)->toDateString();
                $rows[] = ['household_id' => $producer->id, 'product_id' => 0, 'event' => 'profile_view', 'date' => $date, 'hits' => fake()->numberBetween(3, 25)];
                $rows[] = ['household_id' => $producer->id, 'product_id' => 0, 'event' => 'phone_reveal', 'date' => $date, 'hits' => fake()->numberBetween(0, 3)];

                foreach ($products as $productId) {
                    $rows[] = ['household_id' => $producer->id, 'product_id' => $productId, 'event' => 'product_view', 'date' => $date, 'hits' => fake()->numberBetween(1, 12)];
                }
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('producer_stats')->insert($chunk);
        }
    }

    /**
     * A few notifications, so the bell in the header is not empty on a fresh
     * install. They mirror what the application itself would have sent for
     * the data seeded above - messages are not among them, since those have
     * their own badge and inbox.
     *
     * @param  list<Producer>  $producers
     */
    private function seedNotifications(array $producers): void
    {
        foreach ($producers as $producer) {
            $producer->user->notify(SiteNotification::producerApproved(
                $producer->name,
                route('marketplace.producers.show', $producer->slug),
            ));
        }
    }

    private function copyDemoImage(): void
    {
        if (Media::disk()->exists(self::DEMO_IMAGE)) {
            return;
        }

        $contents = (string) file_get_contents(resource_path('js/assets/products-table.jpg'));
        Media::disk()->put(self::DEMO_IMAGE, $contents);
        Media::makeThumbnail(self::DEMO_IMAGE, $contents);
    }

    private function seedAdminUser(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('admin'),
            ]
        );

        $admin->forceFill([
            'name' => 'Admin',
            'password' => Hash::make('admin'),
        ])->save();

        $admin->assignRole('admin');
    }

    /**
     * @return list<Producer>
     */
    private function seedProducersWithProducts(): array
    {
        $producers = [];

        foreach (self::PRODUCERS as $entry) {
            $user = User::factory()->create(['name' => $entry['owner'], 'email' => $entry['email']]);
            $user->assignRole('buyer', 'seller');

            $producer = Producer::factory()->for($user)->active()->create([
                'name' => $entry['name'],
                'city' => $entry['city'],
                // Near the town centre - a demo point on the producer map.
                'lat' => $entry['lat'],
                'lng' => $entry['lng'],
                'delivery_methods' => $entry['delivery'],
                'phone' => '+381 6'.fake()->numberBetween(1, 9).' '.fake()->numerify('### ####'),
                'contact_email' => $entry['email'],
                'story' => 'Sve počinje u sezoni, kada '.mb_strtolower($entry['name']).' počinje pripremu. '
                    .'Radimo u malim serijama, po receptu koji se ne menja, i pakujemo tek kada je gotovo kako treba.',
                'logo_path' => self::DEMO_IMAGE,
                'cover_image_path' => self::DEMO_IMAGE,
            ]);

            $categories = Category::whereIn('name', $entry['categories'])->get();

            foreach ($categories as $category) {
                Product::factory(2)
                    ->for($producer)
                    ->for($category)
                    ->create()
                    ->each(fn (Product $product) => $product->images()->createMany([
                        ['path' => self::DEMO_IMAGE, 'order' => 0],
                        ['path' => self::DEMO_IMAGE, 'order' => 1],
                    ]));
            }

            $producer->images()->createMany(
                collect(['Naše dvorište u jutarnjim satima', 'Priprema, korak po korak', 'Spremno za pakovanje'])
                    ->map(fn (string $caption, int $order) => [
                        'path' => self::DEMO_IMAGE,
                        'caption' => $caption,
                        'order' => $order,
                    ])
                    ->all()
            );

            // A couple of edge-case statuses per producer, so admin/filter
            // screens have out-of-stock and draft products to show as well.
            $producer->products()->inRandomOrder()->first()?->update(['stock_quantity' => 0]);
            Product::factory()->for($producer)->for($categories->first())->create(['status' => 'draft']);

            $producers[] = $producer;
        }

        return $producers;
    }

    /**
     * @return list<User>
     */
    private function seedBuyers(): array
    {
        return collect(self::BUYERS)->map(function (string $email, string $name) {
            $buyer = User::factory()->create(['name' => $name, 'email' => $email]);
            $buyer->assignRole('buyer');

            return $buyer;
        })->values()->all();
    }

    /**
     * One thread per buyer, covering the states an inbox can be in: answered
     * conversations, questions the producer hasn't got to yet, and threads
     * opened from a product page rather than from the producer's profile.
     *
     * @param  list<Producer>  $producers
     * @param  list<User>  $buyers
     */
    private function seedConversations(array $producers, array $buyers): void
    {
        $openings = [
            'Dobar dan, da li imate ajvar u tegli od 720ml i kolika je cena za pet tegli?',
            'Pozdrav, da li šaljete kurirskom službom za Beograd?',
            'Zanima me da li je ovo iz ovogodišnje berbe i koliko imate na raspolaganju.',
            'Dobar dan, da li može preuzimanje vikendom i u kojim satima?',
            'Pozdrav, koliko unapred treba naručiti za veću količinu?',
            'Da li pakujete u manja pakovanja za poklon?',
        ];

        $replies = [
            'Dobar dan, imamo. Za pet tegli može dogovor oko cene, javite mi kada vam odgovara preuzimanje.',
            'Pozdrav, šaljemo kurirskom službom svakog utorka i petka.',
            'Jeste, sve je iz ovogodišnje berbe. Trenutno imamo dovoljno, recite koliko vam treba.',
            'Može i subotom i nedeljom, najbolje pre podne. Javite dan ranije.',
        ];

        foreach ($buyers as $index => $buyer) {
            $producer = $producers[$index % count($producers)];

            // Every other thread starts from a product page, so the product
            // context shown inside a thread has demo data too.
            $product = $index % 2 === 0
                ? $producer->products()->where('status', 'active')->first()
                : null;

            ProducerMessage::create([
                'household_id' => $producer->id,
                'product_id' => $product?->id,
                'buyer_id' => $buyer->id,
                'sender_id' => $buyer->id,
                'body' => $openings[$index % count($openings)],
                'read_at' => $index < count($replies) ? now()->subDay() : null,
            ]);

            // The last two buyers are left waiting, so a producer's inbox has
            // something unread to show.
            if ($index >= count($replies)) {
                continue;
            }

            ProducerMessage::create([
                'household_id' => $producer->id,
                'buyer_id' => $buyer->id,
                'sender_id' => $producer->user_id,
                'body' => $replies[$index],
                'read_at' => $index === 0 ? now()->subHours(20) : null,
            ]);
        }
    }

    /**
     * Reviews only where the producer has replied, which is exactly what
     * ReviewPolicy allows: the demo data must not promise a button the
     * application would then refuse.
     *
     * Ratings are cycled rather than randomised so the demo set always has a
     * spread, and the last eligible review is left waiting for a moderator so
     * the admin panel's queue isn't empty on a fresh install.
     *
     * @param  list<Producer>  $producers
     * @param  list<User>  $buyers
     */
    private function seedReviews(array $producers, array $buyers): void
    {
        $comments = [
            5 => 'Ukus baš kao od kuće, stiglo brzo i pažljivo upakovano.',
            4 => 'Kvalitetno, samo je dostava malo kasnila.',
            3 => 'Dobro, ali sam očekivao malo veće pakovanje za tu cenu.',
        ];

        $eligible = [];

        foreach ($buyers as $index => $buyer) {
            $producer = $producers[$index % count($producers)];

            $answered = ProducerMessage::query()
                ->where('household_id', $producer->id)
                ->where('buyer_id', $buyer->id)
                ->where('sender_id', $producer->user_id)
                ->exists();

            if ($answered) {
                $eligible[] = [$buyer, $producer];
            }
        }

        $ratings = [5, 4, 3];

        foreach ($eligible as $index => [$buyer, $producer]) {
            $rating = $ratings[$index % count($ratings)];
            $isLast = $index === count($eligible) - 1 && count($eligible) > 1;

            Review::create([
                'user_id' => $buyer->id,
                'household_id' => $producer->id,
                'rating' => $rating,
                'comment' => $comments[$rating],
                // The first reviewer attaches a photo, so the review-image
                // path has demo data too.
                'image_path' => $index === 0 ? self::DEMO_IMAGE : null,
                'status' => $isLast ? Review::STATUS_PENDING : Review::STATUS_APPROVED,
                'approved_at' => $isLast ? null : now()->subDays(($index + 1) * 3),
            ]);
        }
    }
}
