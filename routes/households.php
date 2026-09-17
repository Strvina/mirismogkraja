<?php

use App\Http\Controllers\HouseholdController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('moja-domacinstva')->name('households.')->group(function () {
    Route::get('/', [HouseholdController::class, 'index'])->name('index');
    Route::get('/novo', [HouseholdController::class, 'create'])->name('create');
    Route::post('/', [HouseholdController::class, 'store'])->name('store');
    Route::get('/{household}/izmena', [HouseholdController::class, 'edit'])->name('edit');
    Route::put('/{household}', [HouseholdController::class, 'update'])->name('update');
    Route::delete('/{household}', [HouseholdController::class, 'destroy'])->name('destroy');
});
