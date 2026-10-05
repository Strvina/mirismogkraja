<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAlert;
use App\Notifications\SiteNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * "Javi mi kad stigne" on a product that is out of stock or out of
 * season - asked for, or called off. Answered by products:send-alerts.
 */
class ProductAlertController extends Controller
{
    /**
     * How many people waiting it takes to tell the producer. The first one
     * is news; after that only round numbers, so a popular product does not
     * ring the bell for every buyer.
     */
    public const MILESTONES = [1, 3, 5, 10, 25, 50, 100];

    public function toggle(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->isPubliclyVisible(), 404);
        abort_if($product->producer->user_id === $request->user()->id, 403);

        $alert = ProductAlert::where('user_id', $request->user()->id)->where('product_id', $product->id)->first();

        if ($alert) {
            $alert->delete();
        } elseif (! $product->isAvailable()) {
            ProductAlert::create(['user_id' => $request->user()->id, 'product_id' => $product->id]);
            $this->tellProducer($product);
        }

        return back();
    }

    /**
     * "Čeka vas X kupaca": demand the producer would otherwise never see,
     * since nobody writes about what is marked as gone.
     */
    private function tellProducer(Product $product): void
    {
        $waiting = $product->alerts()->count();

        // Once per milestone and wait: asking, calling off and asking again
        // must not ring the producer's bell each time.
        if (! in_array($waiting, self::MILESTONES, true) || ! Cache::add("product-wanted:{$product->id}:{$waiting}", true, now()->addDays(30))) {
            return;
        }

        $product->producer->user?->notify(SiteNotification::productWanted(
            $product->name,
            $waiting,
            route('producers.products.index', ['producer' => $product->producer_id, 'cekaju' => 1]),
        ));
    }
}
