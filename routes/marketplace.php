<?php

use App\Http\Controllers\CampaignController;
use App\Http\Controllers\Marketplace\FoundingProducerController;
use App\Http\Controllers\Marketplace\ProducerController;
use App\Http\Controllers\Marketplace\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ReviewReplyController;
use Illuminate\Support\Facades\Route;

Route::get('/proizvodjaci', [ProducerController::class, 'index'])->name('marketplace.producers.index');
Route::get('/osnivaci', FoundingProducerController::class)->name('marketplace.founding');
// The page's first address, from when there were a hundred places.
Route::redirect('/prvih-100', '/osnivaci', 301);
Route::get('/kampanja/{campaign:slug}', [CampaignController::class, 'show'])->name('campaigns.show');
Route::get('/proizvodjac/{producer:slug}', [ProducerController::class, 'show'])->name('marketplace.producers.show');
Route::get('/proizvodi', [ProductController::class, 'index'])->name('marketplace.products.index');
Route::get('/kategorija/{category:slug}', [ProductController::class, 'category'])->name('marketplace.categories.show');
Route::get('/proizvod/{product:slug}', [ProductController::class, 'show'])->name('marketplace.products.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/proizvodjac/{producer}/ocene', [ReviewController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('reviews.store');
    Route::delete('/ocene/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
    Route::put('/ocene/{review}/odgovor', [ReviewReplyController::class, 'update'])->middleware('throttle:10,1')->name('reviews.reply');
});
