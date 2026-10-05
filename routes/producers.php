<?php

use App\Http\Controllers\PostController;
use App\Http\Controllers\ProducerCertificateController;
use App\Http\Controllers\ProducerController;
use App\Http\Controllers\ProducerImageController;
use App\Http\Controllers\ProducerMarketController;
use App\Http\Controllers\ProducerStatisticsController;
use App\Http\Controllers\QuickReplyController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('moji-proizvodjaci')->name('producers.')->group(function () {
    Route::get('/', [ProducerController::class, 'index'])->name('index');
    Route::get('/novo', [ProducerController::class, 'create'])->name('create');
    // Uploads photos and notifies the admins: a few a minute is plenty.
    Route::post('/', [ProducerController::class, 'store'])->middleware('throttle:5,1')->name('store');
    Route::get('/{producer}/izmena', [ProducerController::class, 'edit'])->name('edit');
    Route::get('/{producer}/statistika', [ProducerStatisticsController::class, 'show'])->name('statistics');
    Route::get('/{producer}/poster.pdf', [ProducerController::class, 'poster'])->middleware('throttle:10,1')->name('poster');
    Route::put('/{producer}', [ProducerController::class, 'update'])->name('update');
    Route::delete('/{producer}', [ProducerController::class, 'destroy'])->name('destroy');

    Route::post('/{producer}/galerija', [ProducerImageController::class, 'store'])->middleware('throttle:30,1')->name('images.store');
    Route::delete('/{producer}/galerija/{image}', [ProducerImageController::class, 'destroy'])->name('images.destroy');

    // "Gde me nađete": markets and the days the producer is there.
    Route::get('/{producer}/pijace', [ProducerMarketController::class, 'index'])->name('markets.index');
    Route::post('/{producer}/pijace', [ProducerMarketController::class, 'store'])->middleware('throttle:30,1')->name('markets.store');
    Route::put('/{producer}/pijace/{market}', [ProducerMarketController::class, 'update'])->middleware('throttle:30,1')->name('markets.update');
    Route::delete('/{producer}/pijace/{market}', [ProducerMarketController::class, 'destroy'])->name('markets.destroy');

    // Certificates: uploads are large and each one notifies the admins.
    Route::get('/{producer}/sertifikati', [ProducerCertificateController::class, 'index'])->name('certificates.index');
    Route::post('/{producer}/sertifikati', [ProducerCertificateController::class, 'store'])->middleware('throttle:6,1')->name('certificates.store');
    Route::get('/{producer}/sertifikati/{certificate}/dokument', [ProducerCertificateController::class, 'file'])->middleware('throttle:60,1')->name('certificates.file');
    Route::delete('/{producer}/sertifikati/{certificate}', [ProducerCertificateController::class, 'destroy'])->name('certificates.destroy');

    // Stories and recipes. Publishing one notifies followers and admins.
    Route::get('/{producer}/price', [PostController::class, 'index'])->name('posts.index');
    Route::get('/{producer}/price/nova', [PostController::class, 'create'])->name('posts.create');
    Route::post('/{producer}/price', [PostController::class, 'store'])->middleware('throttle:10,1')->name('posts.store');
    Route::get('/{producer}/price/{post}/izmena', [PostController::class, 'edit'])->name('posts.edit');
    Route::put('/{producer}/price/{post}', [PostController::class, 'update'])->middleware('throttle:20,1')->name('posts.update');
    Route::delete('/{producer}/price/{post}', [PostController::class, 'destroy'])->name('posts.destroy');

    // Saved answers for the message box.
    Route::get('/{producer}/brzi-odgovori', [QuickReplyController::class, 'index'])->name('quick-replies.index');
    Route::post('/{producer}/brzi-odgovori', [QuickReplyController::class, 'store'])->middleware('throttle:30,1')->name('quick-replies.store');
    Route::post('/{producer}/brzi-odgovori/predlozi', [QuickReplyController::class, 'storeStarters'])->middleware('throttle:6,1')->name('quick-replies.starters');
    Route::put('/{producer}/brzi-odgovori/{reply}', [QuickReplyController::class, 'update'])->middleware('throttle:30,1')->name('quick-replies.update');
    Route::delete('/{producer}/brzi-odgovori/{reply}', [QuickReplyController::class, 'destroy'])->name('quick-replies.destroy');
});

// Contact clicks reported by a visitor's browser. Public, since
// most visitors are not signed in; limited, since it only counts.
Route::post('/statistika/{producer}/{event}', [ProducerStatisticsController::class, 'click'])
    ->middleware('throttle:60,1')
    ->name('statistics.click');
