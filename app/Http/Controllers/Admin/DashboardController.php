<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => User::count(),
                'producers' => Producer::count(),
                'products' => Product::count(),
                // A thread is one (producer, buyer) pair. Counted through a
                // subquery rather than ->distinct()->count(), which Laravel
                // compiles down to COUNT(*) and would simply repeat the
                // message total. product_id is deliberately left out: it only
                // marks which product opened a thread, and replies don't
                // carry it.
                'conversations' => DB::query()->fromSub(
                    ProducerMessage::query()->select('household_id', 'buyer_id')->distinct(),
                    'threads'
                )->count(),
                'messages' => ProducerMessage::count(),
            ],
        ]);
    }
}
