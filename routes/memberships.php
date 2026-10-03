<?php

use App\Http\Controllers\BoostController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\PaymentSlipQrController;
use App\Support\PaidItems;
use Illuminate\Support\Facades\Route;

// Every write here records a payment request and notifies the
// admins, so each is limited well above what a person clicks.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/clanarina', [MembershipController::class, 'index'])->name('memberships.index');
    Route::post('/clanarina', [MembershipController::class, 'store'])->middleware('throttle:10,1')->name('memberships.store');
    Route::get('/clanarina/{subscription}/uplatnica.pdf', [MembershipController::class, 'slip'])->name('memberships.slip');

    // Paid boosts, paid by the same kind of slip.
    Route::get('/isticanje', [BoostController::class, 'index'])->name('boosts.index');
    Route::post('/isticanje', [BoostController::class, 'store'])->middleware('throttle:10,1')->name('boosts.store');
    Route::get('/isticanje/{boost}/uplatnica.pdf', [BoostController::class, 'slip'])->name('boosts.slip');

    // Seasonal campaigns, paid by the same kind of slip.
    Route::get('/kampanje', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::post('/kampanje/{campaign}/prijava', [CampaignController::class, 'join'])->middleware('throttle:10,1')->name('campaigns.join');
    Route::get('/kampanje/uplatnica/{participant}.pdf', [CampaignController::class, 'slip'])->name('campaigns.slip');
    // The QR code of any of the three slips, for the slip dialog.
    Route::get('/uplatnica/{kind}/{id}/qr.svg', PaymentSlipQrController::class)
        ->whereIn('kind', array_keys(PaidItems::KINDS))->whereNumber('id')->name('payment-slips.qr');

});
