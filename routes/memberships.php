<?php

use App\Http\Controllers\BoostController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CancellationRequestController;
use App\Http\Controllers\MembershipController;
use App\Support\PaidItems;
use Illuminate\Support\Facades\Route;

// Every write here records a payment request or a refund and notifies the
// admins, so each is limited well above what a person clicks.
Route::middleware('auth')->group(function () {
    Route::get('/clanarina', [MembershipController::class, 'index'])->name('memberships.index');
    Route::post('/clanarina', [MembershipController::class, 'store'])->middleware('throttle:10,1')->name('memberships.store');
    Route::get('/clanarina/{subscription}/uplatnica.pdf', [MembershipController::class, 'slip'])->name('memberships.slip');

    // Paid boosts (task 20.2), paid by the same kind of slip.
    Route::get('/isticanje', [BoostController::class, 'index'])->name('boosts.index');
    Route::post('/isticanje', [BoostController::class, 'store'])->middleware('throttle:10,1')->name('boosts.store');
    Route::get('/isticanje/{boost}/uplatnica.pdf', [BoostController::class, 'slip'])->name('boosts.slip');

    // Seasonal campaigns (task 20.3), paid by the same kind of slip.
    Route::get('/kampanje', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::post('/kampanje/{campaign}/prijava', [CampaignController::class, 'join'])->middleware('throttle:10,1')->name('campaigns.join');
    Route::get('/kampanje/uplatnica/{participant}.pdf', [CampaignController::class, 'slip'])->name('campaigns.slip');

    // Asking for something paid for to be stopped, and where a refund goes;
    // an admin decides. {kind} is clanarina, isticanje or kampanja.
    Route::post('/otkazivanje/{kind}/{id}', [CancellationRequestController::class, 'store'])
        ->whereIn('kind', array_keys(PaidItems::KINDS))->whereNumber('id')->middleware('throttle:10,1')->name('cancellation.request');
    Route::put('/povracaj/{kind}/{id}/racun', [CancellationRequestController::class, 'refundAccount'])
        ->whereIn('kind', array_keys(PaidItems::KINDS))->whereNumber('id')->middleware('throttle:10,1')->name('refunds.account');
});
