<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Household;
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
     * households each specialised in a couple of categories with priced
     * products and images, plain buyer accounts, orders spread across every
     * status, reviews with a realistic rating spread, and a cart left
     * mid-checkout - so every screen (dashboard stats, order lists, reviews,
     * cart, filters) has real content to demo instead of being empty.
     */
    public function run(): void
    {
        $this->seedAdminUser();
        $households = $this->seedHouseholdsWithProducts();
        $buyers = $this->seedBuyers();
        $this->seedOrdersAndReviews($households, $buyers);
        $this->seedAbandonedCart($households, $buyers);
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
     * Each entry is a household specialised in a couple of real categories,
     * so the catalog reads as plausible instead of random name/category pairs.
     *
     * @return list<Household>
     */
    private function seedHouseholdsWithProducts(): array
    {
        $data = [
            ['name' => 'Domaćinstvo Nićić', 'city' => 'Leskovac', 'categories' => ['Meso i suhomesnato', 'Rakija i vino']],
            ['name' => 'Mlekara Zapis', 'city' => 'Zlatibor', 'categories' => ['Mlečni proizvodi', 'Jaja']],
            ['name' => 'Pčelinjak Medovina', 'city' => 'Niš', 'categories' => ['Med i pčelinji proizvodi', 'Ostalo']],
            ['name' => 'Voćarstvo Južni Sad', 'city' => 'Aleksinac', 'categories' => ['Voće', 'Rakija i vino']],
            ['name' => 'Bašta Ivanovića', 'city' => 'Vranje', 'categories' => ['Povrće', 'Žitarice']],
            ['name' => 'Salaš Kraljević', 'city' => 'Novi Sad', 'categories' => ['Žitarice', 'Jaja', 'Meso i suhomesnato']],
        ];

        $households = [];

        foreach ($data as $entry) {
            $user = User::factory()->create();
            $user->assignRole('buyer', 'seller');

            $household = Household::factory()->for($user)->active()->create([
                'name' => $entry['name'],
                'city' => $entry['city'],
                'logo_path' => 'households/'.fake()->uuid().'.jpg',
                'cover_image_path' => 'households/'.fake()->uuid().'.jpg',
            ]);

            $categories = Category::whereIn('name', $entry['categories'])->get();

            foreach ($categories as $category) {
                Product::factory(2)
                    ->for($household)
                    ->for($category)
                    ->create()
                    ->each(fn (Product $product) => $product->images()->createMany([
                        ['path' => 'products/'.fake()->uuid().'.jpg', 'order' => 0],
                        ['path' => 'products/'.fake()->uuid().'.jpg', 'order' => 1],
                    ]));
            }

            // A couple of edge-case statuses per household, so admin/filter
            // screens have out-of-stock and draft products to show as well.
            $household->products()->inRandomOrder()->first()?->update(['status' => 'out_of_stock', 'stock_quantity' => 0]);
            Product::factory()->for($household)->for($categories->first())->create(['status' => 'draft']);

            $households[] = $household;
        }

        return $households;
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
     * @param  list<Household>  $households
     * @param  list<User>  $buyers
     */
    private function seedOrdersAndReviews(array $households, array $buyers): void
    {
        $cart = new CartService;
        $checkout = new CheckoutService;
        $orderStatus = new OrderStatusService;

        $comments = [
            5 => ['Ukus baš kao od kuće, stiglo brzo i pažljivo upakovano.', 'Odlična saradnja, sve preporuke!', 'Vraćam se sigurno po još.'],
            4 => ['Kvalitetno, samo je dostava malo kasnila.', 'Vredi cene, ukus je odličan.'],
            3 => ['Dobro, ali sam očekivao malo veće pakovanje za tu cenu.'],
        ];

        // Buyer #1 & #2: delivered orders from two different households -> both leave reviews.
        foreach ([0 => $buyers[0], 1 => $buyers[1]] as $index => $buyer) {
            $household = $households[$index];
            $cart->add($buyer, $household->products()->where('status', 'active')->first(), fake()->numberBetween(1, 3));
            $order = $checkout->checkout($buyer, fake()->streetAddress().', '.$household->city);
            $orderStatus->transitionTo($order, 'confirmed');
            $orderStatus->transitionTo($order, 'shipped');
            $orderStatus->transitionTo($order, 'delivered');

            $rating = fake()->randomElement([5, 5, 4]);
            Review::create([
                'user_id' => $buyer->id,
                'household_id' => $household->id,
                'rating' => $rating,
                'comment' => fake()->randomElement($comments[$rating]),
            ]);
        }

        // Buyer #3: order confirmed but not yet shipped.
        $product = $households[2]->products()->where('status', 'active')->first();
        $cart->add($buyers[2], $product, 1);
        $order = $checkout->checkout($buyers[2], fake()->streetAddress().', '.$households[2]->city);
        $orderStatus->transitionTo($order, 'confirmed');

        // Buyer #4: order just placed, still pending.
        $cart->add($buyers[3], $households[3]->products()->where('status', 'active')->first(), 2);
        $checkout->checkout($buyers[3], fake()->streetAddress().', '.$households[3]->city);

        // Buyer #5: order shipped, on its way.
        $cart->add($buyers[4], $households[4]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[4], fake()->streetAddress().', '.$households[4]->city);
        $orderStatus->transitionTo($order, 'confirmed');
        $orderStatus->transitionTo($order, 'shipped');

        // Buyer #6: order cancelled after being placed.
        $cart->add($buyers[5], $households[5]->products()->where('status', 'active')->first(), 1);
        $order = $checkout->checkout($buyers[5], fake()->streetAddress().', '.$households[5]->city);
        $orderStatus->transitionTo($order, 'cancelled');

        // A few extra reviews on households without an order-linked one yet,
        // for a fuller/realistic rating spread (mostly good, occasionally middling).
        foreach ([$households[2], $households[3], $households[4], $households[5]] as $household) {
            $reviewer = fake()->randomElement($buyers);

            if (Review::where('user_id', $reviewer->id)->where('household_id', $household->id)->exists()) {
                continue;
            }

            $rating = fake()->randomElement([5, 5, 4, 4, 3]);
            Review::create([
                'user_id' => $reviewer->id,
                'household_id' => $household->id,
                'rating' => $rating,
                'comment' => fake()->randomElement($comments[$rating]),
            ]);
        }
    }

    /**
     * @param  list<Household>  $households
     * @param  list<User>  $buyers
     */
    private function seedAbandonedCart(array $households, array $buyers): void
    {
        $cart = new CartService;
        $lastBuyer = end($buyers);

        $cart->add($lastBuyer, $households[0]->products()->where('status', 'active')->skip(1)->first(), 3);
        $cart->add($lastBuyer, $households[1]->products()->where('status', 'active')->skip(1)->first(), 1);
    }
}
