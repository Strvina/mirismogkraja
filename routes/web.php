<?php

use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/producers.php';
require __DIR__.'/marketplace.php';
require __DIR__.'/products.php';
require __DIR__.'/favorites.php';
require __DIR__.'/messages.php';
require __DIR__.'/notifications.php';
require __DIR__.'/follows.php';
require __DIR__.'/reports.php';
require __DIR__.'/admin.php';
