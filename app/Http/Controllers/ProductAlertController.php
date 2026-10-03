<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAlert;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * "Javi mi kad stigne" on a product that is out of stock or out of
 * season - asked for, or called off. Answered by products:send-alerts.
 */
class ProductAlertController extends Controller
{
    public function toggle(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->isPubliclyVisible(), 404);
        abort_if($product->producer->user_id === $request->user()->id, 403);

        $alert = ProductAlert::where('user_id', $request->user()->id)->where('product_id', $product->id)->first();

        if ($alert) {
            $alert->delete();
        } elseif (! $product->isAvailable()) {
            ProductAlert::create(['user_id' => $request->user()->id, 'product_id' => $product->id]);
        }

        return back();
    }
}
