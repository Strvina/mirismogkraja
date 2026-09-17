<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\OrderStatusService;
use Illuminate\Database\Seeder;

class DemoContentSeeder extends Seeder
{
    /**
     * Realistic demo data (task 8.1): a couple of seller households with
     * products (task 3.9's original scope), plus buyers who've actually
     * ordered from them - with orders in different statuses, one review,
     * and one buyer with items still sitting in their cart - so every
     * screen (dashboard stats, order lists, reviews, cart) has real content
     * to demo instead of being empty.
     */
    public function run(): void
    {
        $households = $this->seedHouseholdsWithProducts();
        $this->seedOrdersReviewsAndCart($households);
    }

    /**
     * @return list<Household>
     */
    private function seedHouseholdsWithProducts(): array
    {
        $data = [
            ['name' => 'Domaćinstvo Nićić', 'city' => 'Leskovac'],
            ['name' => 'Mlekara Zapis', 'city' => 'Zlatibor'],
        ];

        $categories = Category::all();
        $households = [];

        foreach ($data as $entry) {
            $user = User::factory()->create();
            $user->assignRole('buyer', 'seller');

            $household = Household::factory()->for($user)->active()->create([
                'name' => $entry['name'],
                'city' => $entry['city'],
            ]);

            foreach ($categories as $category) {
                Product::factory()->for($household)->for($category)->create(['status' => 'active']);
            }

            $households[] = $household;
        }

        return $households;
    }

    /**
     * @param  list<Household>  $households
     */
    private function seedOrdersReviewsAndCart(array $households): void
    {
        $cart = new CartService;
        $checkout = new CheckoutService;
        $orderStatus = new OrderStatusService;

        // Buyer #1: a delivered order -> eligible to leave a review.
        $buyerOne = User::factory()->create();
        $buyerOne->assignRole('buyer');
        $productOne = $households[0]->products()->first();
        $cart->add($buyerOne, $productOne, 2);
        $orderOne = $checkout->checkout($buyerOne, 'Bulevar oslobođenja 1, Leskovac');
        $orderStatus->transitionTo($orderOne, 'confirmed');
        $orderStatus->transitionTo($orderOne, 'shipped');
        $orderStatus->transitionTo($orderOne, 'delivered');

        $households[0]->reviews()->create([
            'user_id' => $buyerOne->id,
            'rating' => 5,
            'comment' => 'Ukus baš kao od kuće, stiglo brzo i pažljivo upakovano.',
        ]);

        // Buyer #2: a pending order (still being processed).
        $buyerTwo = User::factory()->create();
        $buyerTwo->assignRole('buyer');
        $productTwo = $households[1]->products()->first();
        $cart->add($buyerTwo, $productTwo, 1);
        $checkout->checkout($buyerTwo, 'Karađorđeva 5, Zlatibor');

        // Buyer #3: items still in the cart, no order yet.
        $buyerThree = User::factory()->create();
        $buyerThree->assignRole('buyer');
        $cart->add($buyerThree, $households[0]->products()->skip(1)->first(), 3);
        $cart->add($buyerThree, $households[1]->products()->skip(1)->first(), 1);
    }
}
