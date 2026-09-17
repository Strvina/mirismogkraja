<?php

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/naplata', [CheckoutController::class, 'create'])->name('checkout.create');
    Route::post('/naplata', [CheckoutController::class, 'store'])->name('checkout.store');

    Route::get('/porudzbine/{order}', [OrderController::class, 'show'])->name('orders.show');
});
