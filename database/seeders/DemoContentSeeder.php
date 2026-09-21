<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\OrderStatusService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DemoContentSeeder extends Seeder
{
    /**
     * Demo rows all point at this one real file on the public disk, so seeded
     * images actually render instead of 404-ing as invented paths would.
     * Replaced per-producer once they upload their own.
     */
    private const DEMO_IMAGE = 'demo/placeholder.jpg';

    /**
     * Realistic demo data (task 1): an admin account, a handful of seller
     * producers each specialised in a couple of categories with priced
     * products and images, plain buyer accounts, inquiries spread across
     * every status, reviews with a realistic rating spread, a cart left
     * mid-checkout and a couple of message threads - so every screen has
     * real content to demo instead of being empty.
     */
    public function run(): void
    {
        $this->copyDemoImage();
        $this->seedAdminUser();
        $producers = $this->seedProducersWithProducts();
        $buyers = $this->seedBuyers();
        $this->seedOrdersAndReviews($producers, $buyers);
        $this->seedAbandonedCart($producers, $buyers);
        $this->seedMessageThreads($producers, $buyers);
    }

    /**
     * A couple of buyer/producer conversations (task 8), one of them with an
     * unanswered question so the producer's inbox has something unread.
     *
     * @param  list<Producer>  $producers
     * @param  list<User>  $buyers
     */
    private function seedMessageThreads(array $producers, array $buyers): void
    {
        ProducerMessage::create([
            'household_id' => $producers[0]->id,
            'buyer_id' => $buyers[0]->id,
            'sender_id' => $buyers[0]->id,
            'body' => 'Dobar dan, da li imate ajvar u tegli od 720ml i kolika je cena za pet tegli?',
            'read_at' => now()->subDay(),
        ]);

        ProducerMessage::create([
            'household_id' => $producers[0]->id,
            'buyer_id' => $buyers[0]->id,
            'sender_id' => $producers[0]->user_id,
            'body' => 'Dobar dan, imamo. Za pet tegli može dogovor oko cene, javite mi kada vam odgovara preuzimanje.',
            'read_at' => now()->subHours(20),
        ]);

        ProducerMessage::create([
            'household_id' => $producers[1]->id,
            'buyer_id' => $buyers[1]->id,
            'sender_id' => $buyers[1]->id,
            'body' => 'Pozdrav, da li šaljete kurirskom službom za Beograd?',
        ]);
    }

    private function copyDemoImage(): void
    {
        if (Storage::disk('public')->exists(self::DEMO_IMAGE)) {
            return;
        }

        Storage::disk('public')->put(
            self::DEMO_IMAGE,
            file_get_contents(resource_path('js/assets/products-table.jpg'))
        );
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
     * Each entry is a producer specialised in a couple of real categories,
     * so the catalog reads as plausible instead of random name/category pairs.
     *
     * @return list<Producer>
     */
    private function seedProducersWithProducts(): array
    {
        $data = [
            ['name' => 'Domaćinstvo Nićić', 'owner' => 'Dragan Nićić', 'email' => 'nicic@example.com', 'city' => 'Leskovac', 'delivery' => ['licna_dostava', 'preuzimanje'], 'categories' => ['Meso i suhomesnato', 'Rakija i vino']],
            ['name' => 'Mlekara Zapis', 'owner' => 'Vesna Zapis', 'email' => 'zapis@example.com', 'city' => 'Zlatibor', 'delivery' => ['kurirska_sluzba'], 'categories' => ['Mlečni proizvodi', 'Jaja']],
            ['name' => 'Pčelinjak Medovina', 'owner' => 'Slobodan Ilić', 'email' => 'medovina@example.com', 'city' => 'Niš', 'delivery' => ['kurirska_sluzba', 'preuzimanje'], 'categories' => ['Med i pčelinji proizvodi', 'Ostalo']],
            // One producer with wording of their own, to exercise custom methods.
            ['name' => 'Voćarstvo Južni Sad', 'owner' => 'Zoran Stanković', 'email' => 'juznisad@example.com', 'city' => 'Aleksinac', 'delivery' => ['preuzimanje', 'Dostava autobusom na liniji Niš–Beograd'], 'categories' => ['Voće', 'Rakija i vino']],
            ['name' => 'Bašta Ivanovića', 'owner' => 'Snežana Ivanović', 'email' => 'basta@example.com', 'city' => 'Vranje', 'delivery' => ['licna_dostava'], 'categories' => ['Povrće', 'Žitarice']],
            ['name' => 'Salaš Kraljević', 'owner' => 'Đorđe Kraljević', 'email' => 'salas@example.com', 'city' => 'Novi Sad', 'delivery' => ['licna_dostava', 'kurirska_sluzba', 'preuzimanje'], 'categories' => ['Žitarice', 'Jaja', 'Meso i suhomesnato']],
        ];

        $producers = [];

        foreach ($data as $entry) {
            $user = User::factory()->create(['name' => $entry['owner'], 'email' => $entry['email']]);
            $user->assignRole('buyer', 'seller');

            $producer = Producer::factory()->for($user)->active()->create([
                'name' => $entry['name'],
                'city' => $entry['city'],
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
            $producer->products()->inRandomOrder()->first()?->update(['status' => 'out_of_stock', 'stock_quantity' => 0]);
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
        // Predictable addresses (password: "password") so the demo accounts
        // are easy to log into while testing.
        $buyers = [
            'Marko Marković' => 'marko@example.com',
            'Jovana Jovanović' => 'jovana@example.com',
            'Stefan Stefanović' => 'stefan@example.com',
            'Ana Anić' => 'ana@example.com',
            'Nikola Nikolić' => 'nikola@example.com',
            'Milica Milić' => 'milica@example.com',
        ];

        return collect($buyers)->map(function (string $email, string $name) {
            $buyer = User::factory()->create(['name' => $name, 'email' => $email]);
            $buyer->assignRole('buyer');

            return $buyer;
        })->values()->all();
    }

    /**
     * @param  list<Producer>  $producers
     * @param  list<User>  $buyers
     */
    private function seedOrdersAndReviews(array $producers, array $buyers): void
    {
        $cart = new CartService;
        $checkout = new CheckoutService;
        $orderStatus = new OrderStatusService;

        $comments = [
            5 => ['Ukus baš kao od kuće, stiglo brzo i pažljivo upakovano.', 'Odlična saradnja, sve preporuke!', 'Vraćam se sigurno po još.'],
            4 => ['Kvalitetno, samo je dostava malo kasnila.', 'Vredi cene, ukus je odličan.'],
            3 => ['Dobro, ali sam očekivao malo veće pakovanje za tu cenu.'],
        ];

        // Buyer #1 & #2: fulfilled inquiries from two producers -> both leave reviews.
        foreach ([0 => $buyers[0], 1 => $buyers[1]] as $index => $buyer) {
            $producer = $producers[$index];
            $cart->add($buyer, $producer->products()->where('status', 'active')->first(), fake()->numberBetween(1, 3));
            $order = $checkout->checkout($buyer, fake()->streetAddress().', '.$producer->city);
            $item = $order->items()->sole();
            $orderStatus->transitionTo($item, 'contacted');
            $orderStatus->transitionTo($item, 'fulfilled');

            $rating = fake()->randomElement([5, 5, 4]);
            Review::create([
                'user_id' => $buyer->id,
                'household_id' => $producer->id,
                'rating' => $rating,
                'comment' => fake()->randomElement($comments[$rating]),
                // The first reviewer attaches a photo of what arrived, so the
                // "slika uz utisak" path has demo data too.
                'image_path' => $index === 0 ? self::DEMO_IMAGE : null,
            ]);
        }

        // Buyer #3: producer has made contact, nothing settled yet.
        $product = $producers[2]->products()->where('status', 'active')->first();
        $cart->add($buyers[2], $product, 1);
        $order = $checkout->checkout($buyers[2], fake()->streetAddress().', '.$producers[2]->city);
        $orderStatus->transitionTo($order->items()->sole(), 'contacted');

        // Buyer #4: inquiry just sent, still waiting.
        $cart->add($buyers[3], $producers[3]->products()->where('status', 'active')->first(), 2);
        $checkout->checkout($buyers[3], fake()->streetAddress().', '.$producers[3]->city);

        // Buyer #5: another inquiry the producer reported as fulfilled.
        $cart->add($buyers[4], $producers[4]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[4], fake()->streetAddress().', '.$producers[4]->city);
        $item = $order->items()->sole();
        $orderStatus->transitionTo($item, 'contacted');
        $orderStatus->transitionTo($item, 'fulfilled');

        // Buyer #6: inquiry that came to nothing.
        $cart->add($buyers[5], $producers[5]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[5], fake()->streetAddress().', '.$producers[5]->city);
        $orderStatus->transitionTo($order->items()->sole(), 'cancelled');

        // A few extra reviews on producers without an order-linked one yet,
        // for a fuller/realistic rating spread (mostly good, occasionally middling).
        foreach ([$producers[2], $producers[3], $producers[4], $producers[5]] as $producer) {
            $reviewer = fake()->randomElement($buyers);

            if (Review::where('user_id', $reviewer->id)->where('household_id', $producer->id)->exists()) {
                continue;
            }

            $rating = fake()->randomElement([5, 5, 4, 4, 3]);
            Review::create([
                'user_id' => $reviewer->id,
                'household_id' => $producer->id,
                'rating' => $rating,
                'comment' => fake()->randomElement($comments[$rating]),
            ]);
        }
    }

    /**
     * @param  list<Producer>  $producers
     * @param  list<User>  $buyers
     */
    private function seedAbandonedCart(array $producers, array $buyers): void
    {
        $cart = new CartService;
        $lastBuyer = end($buyers);

        $cart->add($lastBuyer, $producers[0]->products()->where('status', 'active')->skip(1)->first(), 3);
        $cart->add($lastBuyer, $producers[1]->products()->where('status', 'active')->skip(1)->first(), 1);
    }
}
