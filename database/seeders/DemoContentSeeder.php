<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\OrderStatusService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoContentSeeder extends Seeder
{
    /**
     * Realistic demo data (task 1): an admin account, a handful of seller
     * producers each specialised in a couple of categories with priced
     * products and images, plain buyer accounts, orders spread across every
     * status, reviews with a realistic rating spread, and a cart left
     * mid-checkout - so every screen (dashboard stats, order lists, reviews,
     * cart, filters) has real content to demo instead of being empty.
     */
    public function run(): void
    {
        $this->seedAdminUser();
        $producers = $this->seedProducersWithProducts();
        $buyers = $this->seedBuyers();
        $this->seedOrdersAndReviews($producers, $buyers);
        $this->seedAbandonedCart($producers, $buyers);
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
            ['name' => 'Domaćinstvo Nićić', 'city' => 'Leskovac', 'categories' => ['Meso i suhomesnato', 'Rakija i vino']],
            ['name' => 'Mlekara Zapis', 'city' => 'Zlatibor', 'categories' => ['Mlečni proizvodi', 'Jaja']],
            ['name' => 'Pčelinjak Medovina', 'city' => 'Niš', 'categories' => ['Med i pčelinji proizvodi', 'Ostalo']],
            ['name' => 'Voćarstvo Južni Sad', 'city' => 'Aleksinac', 'categories' => ['Voće', 'Rakija i vino']],
            ['name' => 'Bašta Ivanovića', 'city' => 'Vranje', 'categories' => ['Povrće', 'Žitarice']],
            ['name' => 'Salaš Kraljević', 'city' => 'Novi Sad', 'categories' => ['Žitarice', 'Jaja', 'Meso i suhomesnato']],
        ];

        $producers = [];

        foreach ($data as $entry) {
            $user = User::factory()->create();
            $user->assignRole('buyer', 'seller');

            $producer = Producer::factory()->for($user)->active()->create([
                'name' => $entry['name'],
                'city' => $entry['city'],
                'logo_path' => 'producers/'.fake()->uuid().'.jpg',
                'cover_image_path' => 'producers/'.fake()->uuid().'.jpg',
            ]);

            $categories = Category::whereIn('name', $entry['categories'])->get();

            foreach ($categories as $category) {
                Product::factory(2)
                    ->for($producer)
                    ->for($category)
                    ->create()
                    ->each(fn (Product $product) => $product->images()->createMany([
                        ['path' => 'products/'.fake()->uuid().'.jpg', 'order' => 0],
                        ['path' => 'products/'.fake()->uuid().'.jpg', 'order' => 1],
                    ]));
            }

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
        $names = ['Marko Marković', 'Jovana Jovanović', 'Stefan Stefanović', 'Ana Anić', 'Nikola Nikolić', 'Milica Milić'];

        return collect($names)->map(function (string $name) {
            $buyer = User::factory()->create(['name' => $name]);
            $buyer->assignRole('buyer');

            return $buyer;
        })->all();
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

        // Buyer #1 & #2: delivered orders from two different producers -> both leave reviews.
        foreach ([0 => $buyers[0], 1 => $buyers[1]] as $index => $buyer) {
            $producer = $producers[$index];
            $cart->add($buyer, $producer->products()->where('status', 'active')->first(), fake()->numberBetween(1, 3));
            $order = $checkout->checkout($buyer, fake()->streetAddress().', '.$producer->city);
            $orderStatus->transitionTo($order, 'confirmed');
            $orderStatus->transitionTo($order, 'shipped');
            $orderStatus->transitionTo($order, 'delivered');

            $rating = fake()->randomElement([5, 5, 4]);
            Review::create([
                'user_id' => $buyer->id,
                'household_id' => $producer->id,
                'rating' => $rating,
                'comment' => fake()->randomElement($comments[$rating]),
            ]);
        }

        // Buyer #3: order confirmed but not yet shipped.
        $product = $producers[2]->products()->where('status', 'active')->first();
        $cart->add($buyers[2], $product, 1);
        $order = $checkout->checkout($buyers[2], fake()->streetAddress().', '.$producers[2]->city);
        $orderStatus->transitionTo($order, 'confirmed');

        // Buyer #4: order just placed, still pending.
        $cart->add($buyers[3], $producers[3]->products()->where('status', 'active')->first(), 2);
        $checkout->checkout($buyers[3], fake()->streetAddress().', '.$producers[3]->city);

        // Buyer #5: order shipped, on its way.
        $cart->add($buyers[4], $producers[4]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[4], fake()->streetAddress().', '.$producers[4]->city);
        $orderStatus->transitionTo($order, 'confirmed');
        $orderStatus->transitionTo($order, 'shipped');

        // Buyer #6: order cancelled after being placed.
        $cart->add($buyers[5], $producers[5]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[5], fake()->streetAddress().', '.$producers[5]->city);
        $orderStatus->transitionTo($order, 'cancelled');

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
