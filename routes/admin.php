<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\HouseholdController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/korisnici', [UserController::class, 'index'])->name('users.index');
    Route::patch('/korisnici/{user}/role', [UserController::class, 'updateRoles'])->name('users.roles');
    Route::patch('/korisnici/{user}/blokiraj', [UserController::class, 'toggleBlock'])->name('users.block');

    Route::get('/domacinstva', [HouseholdController::class, 'index'])->name('households.index');
    Route::patch('/domacinstva/{household}/status', [HouseholdController::class, 'updateStatus'])->name('households.status');

    Route::get('/proizvodi', [ProductController::class, 'index'])->name('products.index');
    Route::delete('/proizvodi/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

    Route::get('/kategorije', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('/kategorije', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/kategorije/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/kategorije/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
});
