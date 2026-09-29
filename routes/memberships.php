<?php

use App\Http\Controllers\BoostController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CancellationRequestController;
use App\Http\Controllers\MembershipController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/clanarina', [MembershipController::class, 'index'])->name('memberships.index');
    Route::post('/clanarina', [MembershipController::class, 'store'])->name('memberships.store');
    Route::get('/clanarina/{subscription}/uplatnica.pdf', [MembershipController::class, 'slip'])->name('memberships.slip');

    // Paid boosts (task 20.2), paid by the same kind of slip.
    Route::get('/isticanje', [BoostController::class, 'index'])->name('boosts.index');
    Route::post('/isticanje', [BoostController::class, 'store'])->name('boosts.store');
    Route::get('/isticanje/{boost}/uplatnica.pdf', [BoostController::class, 'slip'])->name('boosts.slip');

    // Seasonal campaigns (task 20.3), paid by the same kind of slip.
    Route::get('/kampanje', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::post('/kampanje/{campaign}/prijava', [CampaignController::class, 'join'])->name('campaigns.join');
    Route::get('/kampanje/uplatnica/{participant}.pdf', [CampaignController::class, 'slip'])->name('campaigns.slip');

    // Asking for something paid for to be stopped; an admin decides.
    Route::post('/otkazivanje/clanarina/{subscription}', [CancellationRequestController::class, 'membership'])->name('cancellation.membership');
    Route::post('/otkazivanje/isticanje/{boost}', [CancellationRequestController::class, 'boost'])->name('cancellation.boost');
    Route::post('/otkazivanje/kampanja/{participant}', [CancellationRequestController::class, 'campaign'])->name('cancellation.campaign');
});
