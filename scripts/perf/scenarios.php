<?php

/*
 * The requests scripts/perf/measure.php times, against the data of
 * Database\Seeders\LoadTestSeeder.
 *
 * Given the database connection, returns a list of
 * ['group', 'name', 'uri', 'as' (an account's e-mail, or null for a guest),
 * 'headers'] - the addresses built from what is actually in the database,
 * so a "last page" is the last page that exists.
 */

use Illuminate\Database\ConnectionInterface;

return function (ConnectionInterface $db): array {
    $domain = 'loadtest.test';
    $userId = fn (string $name) => (int) $db->table('users')->where('email', "{$name}@{$domain}")->value('id');
    $lastPage = fn (int $rows, int $perPage, int $cap = PHP_INT_MAX) => (int) max(1, min($cap, ceil($rows / $perPage)));
    $public = fn () => $db->table('products')
        ->join('producers', 'producers.id', '=', 'products.producer_id')
        ->where('products.status', 'active')->where('producers.status', 'active')->whereNull('producers.deleted_at');

    // The busiest producer is the first one the seeder wrote, and seller1 owns it.
    $busy = $db->table('producers')->where('user_id', $userId('seller1'))->orderBy('id')->first(['id', 'slug']);
    $published = $db->table('producers')->where('status', 'active')->whereNull('deleted_at');
    $ordinary = (clone $published)->orderBy('id')->offset(intdiv((clone $published)->count(), 2))->first(['id', 'slug']);
    $product = $db->table('products')->where('producer_id', $busy->id)->where('status', 'active')->orderByDesc('id')->value('slug');

    $category = fn (string $slug) => $db->table('categories')->where('slug', $slug)->first(['id', 'slug']);
    [$zimnica, $ajvar, $voce] = [$category('zimnica'), $category('ajvar'), $category('voce')];
    $inZimnica = (clone $public())->whereIn('products.category_id', $db->table('categories')->where('id', $zimnica->id)->orWhere('parent_id', $zimnica->id)->pluck('id'))->count();

    $products = $public()->count();
    $producers = (clone $published)->count();
    $busyReviews = $db->table('reviews')->where('producer_id', $busy->id)->where('status', 'approved')->count();

    // Conversations, counted the way the inbox counts them.
    $threads = fn ($query) => $db->query()->fromSub($query->select('producer_id', 'buyer_id')->distinct(), 'threads')->count();
    $buyer = $userId('buyer1');
    $buyerThreads = $threads($db->table('producer_messages')->where('buyer_id', $buyer));
    $sellerThreads = $threads($db->table('producer_messages')->where(fn ($either) => $either
        ->where('buyer_id', $userId('seller1'))
        ->orWhereIn('producer_id', $db->table('producers')->where('user_id', $userId('seller1'))->pluck('id'))));

    // The longest thread on each side: the one with older pages to open.
    $longest = fn ($query) => $query->selectRaw('producer_id, buyer_id, count(*) as messages')->groupBy('producer_id', 'buyer_id')->orderByDesc('messages')->first();
    $buyerThread = $longest($db->table('producer_messages')->where('buyer_id', $buyer));
    $buyerThreadSlug = $db->table('producers')->where('id', $buyerThread->producer_id)->value('slug');
    $sellerThread = $longest($db->table('producer_messages')->where('producer_id', $busy->id));

    $users = $db->table('users')->whereNull('deleted_at')->count();
    $allProducts = $db->table('products')->count();
    $approved = $db->table('reviews')->where('status', 'approved')->count();
    $logs = $db->table('activity_logs')->count();

    // The header's poll: a partial reload that asks for the two badges only.
    $poll = ['X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'marketplace/products/index', 'X-Inertia-Partial-Data' => 'unreadMessages,unreadNotifications'];

    $catalogue = '/proizvodi';
    $scenarios = [
        ['Home', 'home page', '/'],

        ['Catalogue', 'page 1', $catalogue],
        ['Catalogue', 'page 100', "{$catalogue}?page=100"],
        ['Catalogue', 'last allowed page (500)', "{$catalogue}?page=".$lastPage($products, 20, 500)],
        ['Catalogue', '100 per page, page 1', "{$catalogue}?per_page=100"],
        ['Catalogue', '100 per page, last page', "{$catalogue}?per_page=100&page=".$lastPage($products, 100, 500)],
        ['Catalogue', 'cheapest first, page 1', "{$catalogue}?sort=price_asc"],
        ['Catalogue', 'most expensive first, page 1', "{$catalogue}?sort=price_desc"],
        ['Catalogue', 'cheapest first, page 500', "{$catalogue}?sort=price_asc&page=".$lastPage($products, 20, 500)],
        ['Catalogue', 'category filter (Zimnica)', "{$catalogue}?category_id={$zimnica->id}"],
        ['Catalogue', 'producer filter (busiest)', "{$catalogue}?producer_id={$busy->id}"],
        ['Catalogue', 'city filter (Niš)', "{$catalogue}?city=".rawurlencode('Niš')],
        ['Catalogue', 'price range 500-1000', "{$catalogue}?min_price=500&max_price=1000"],
        ['Catalogue', 'in stock', "{$catalogue}?in_stock=1"],
        ['Catalogue', 'in season', "{$catalogue}?in_season=1"],
        ['Catalogue', 'category + city + in stock, cheapest first', "{$catalogue}?category_id={$zimnica->id}&city=".rawurlencode('Niš').'&in_stock=1&sort=price_asc'],
        ['Catalogue', 'page 1, signed in (buyer with 1,300 favourites)', $catalogue, 'buyer1'],

        ['Search', '"ajvar" (about 1,000 matches)', "{$catalogue}?q=ajvar"],
        ['Search', '"domaći" (a third of the catalogue)', "{$catalogue}?q=".rawurlencode('domaći')],
        ['Search', '"domaći", page 100', "{$catalogue}?q=".rawurlencode('domaći').'&page=100'],
        ['Search', '"domaći", cheapest first', "{$catalogue}?q=".rawurlencode('domaći').'&sort=price_asc'],
        ['Search', '"med" (three letters)', "{$catalogue}?q=med"],
        ['Search', '"šljivovica prepečenica" (two words)', "{$catalogue}?q=".rawurlencode('šljivovica prepečenica')],
        ['Search', '"od" (too short for the FULLTEXT index)', "{$catalogue}?q=od"],
        ['Search', '"kivi" (no match)', "{$catalogue}?q=kivi"],
        ['Search', '"ajvar" in a category, in stock', "{$catalogue}?q=ajvar&category_id={$zimnica->id}&in_stock=1"],

        ['Category', 'Zimnica (with subcategories), page 1', "/kategorija/{$zimnica->slug}"],
        ['Category', 'Zimnica, last page', "/kategorija/{$zimnica->slug}?page=".$lastPage($inZimnica, 20, 500)],
        ['Category', 'Zimnica, cheapest first', "/kategorija/{$zimnica->slug}?sort=price_asc"],
        ['Category', 'Ajvar (a subcategory), page 1', "/kategorija/{$ajvar->slug}"],
        ['Category', 'Voće (no subcategories), page 1', "/kategorija/{$voce->slug}"],

        ['Producer directory', 'page 1', '/proizvodjaci'],
        ['Producer directory', 'last page', '/proizvodjaci?page='.$lastPage($producers, 12, 500)],
        ['Producer directory', 'city filter (Niš)', '/proizvodjaci?city='.rawurlencode('Niš')],
        ['Producer directory', 'search "jovanović"', '/proizvodjaci?q='.rawurlencode('jovanović')],
        ['Producer directory', 'nearest to me', '/proizvodjaci?lat=43.32&lng=21.9'],

        ['Producer profile', 'busiest producer (500 products, 750 reviews)', "/proizvodjac/{$busy->slug}"],
        ['Producer profile', 'busiest producer, last page of reviews', "/proizvodjac/{$busy->slug}?page=".$lastPage($busyReviews, 10)],
        ['Producer profile', 'busiest producer, signed in', "/proizvodjac/{$busy->slug}", 'buyer1'],
        ['Producer profile', 'ordinary producer', "/proizvodjac/{$ordinary->slug}"],
        ['Product page', 'a product of the busiest producer', "/proizvod/{$product}"],

        ['Inbox', 'buyer with 280 conversations, page 1', '/poruke', 'buyer1'],
        ['Inbox', 'buyer with 280 conversations, last page', '/poruke?page='.$lastPage($buyerThreads, 30), 'buyer1'],
        ['Inbox', 'buyer with one conversation', '/poruke', 'buyer6000'],
        ['Inbox', 'producer with 1,800 conversations, page 1', '/poruke', 'seller1'],
        ['Inbox', 'producer with 1,800 conversations, page 30', '/poruke?page=30', 'seller1'],
        ['Inbox', 'producer with 1,800 conversations, last page', '/poruke?page='.$lastPage($sellerThreads, 30), 'seller1'],
        ['Thread', "buyer's side, newest page ({$buyerThread->messages} messages)", "/poruke/{$buyerThreadSlug}", 'buyer1'],
        ['Thread', "buyer's side, oldest page", "/poruke/{$buyerThreadSlug}?page=".$lastPage((int) $buyerThread->messages, 50), 'buyer1'],
        ['Thread', "producer's side, newest page ({$sellerThread->messages} messages)", "/poruke-proizvodjaca/{$sellerThread->producer_id}/{$sellerThread->buyer_id}", 'seller1'],
        ['Thread', "producer's side, oldest page", "/poruke-proizvodjaca/{$sellerThread->producer_id}/{$sellerThread->buyer_id}?page=".$lastPage((int) $sellerThread->messages, 50), 'seller1'],
        ['Header poll', 'unread badges, busiest producer', $catalogue, 'seller1', $poll],
        ['Header poll', 'unread badges, buyer with 280 conversations', $catalogue, 'buyer1', $poll],

        ['Admin', 'dashboard', '/admin', 'admin1'],
        ['Admin', 'users, page 1', '/admin/korisnici', 'admin1'],
        ['Admin', 'users, last page', '/admin/korisnici?page='.$lastPage($users, 50), 'admin1'],
        ['Admin', 'users, search "jovan"', '/admin/korisnici?search=jovan', 'admin1'],
        ['Admin', 'users, sellers tab', '/admin/korisnici?group=sellers', 'admin1'],
        ['Admin', 'producers, page 1', '/admin/proizvodjaci', 'admin1'],
        ['Admin', 'producers, last page', '/admin/proizvodjaci?page='.$lastPage($db->table('producers')->whereNull('deleted_at')->count(), 25), 'admin1'],
        ['Admin', 'producers, waiting for approval', '/admin/proizvodjaci?status=pending', 'admin1'],
        ['Admin', 'products, page 1', '/admin/proizvodi', 'admin1'],
        ['Admin', 'products, last page', '/admin/proizvodi?page='.$lastPage($allProducts, 25), 'admin1'],
        ['Admin', 'products, search "ajvar"', '/admin/proizvodi?search=ajvar', 'admin1'],
        ['Admin', 'products, status active', '/admin/proizvodi?status=active', 'admin1'],
        ['Admin', 'products, of the busiest producer', "/admin/proizvodi?producer_id={$busy->id}", 'admin1'],
        ['Admin', 'reviews, waiting (default tab)', '/admin/utisci', 'admin1'],
        ['Admin', 'reviews, published, page 1', '/admin/utisci?status=approved', 'admin1'],
        ['Admin', 'reviews, published, last page', '/admin/utisci?status=approved&page='.$lastPage($approved, 30), 'admin1'],
        ['Admin', 'activity log, page 1', '/admin/logovi', 'admin1'],
        ['Admin', 'activity log, last page', '/admin/logovi?page='.$lastPage($logs, 30), 'admin1'],
        ['Admin', 'activity log, updated products', '/admin/logovi?action=updated&subject=Product', 'admin1'],
        ['Admin', 'memberships, waiting for payment', '/admin/clanarine', 'admin1'],
        ['Admin', 'boosts, waiting for payment', '/admin/isticanja', 'admin1'],
    ];

    return array_map(fn (array $scenario) => [
        'group' => $scenario[0],
        'name' => $scenario[1],
        'uri' => $scenario[2],
        'as' => isset($scenario[3]) ? "{$scenario[3]}@{$domain}" : null,
        'headers' => $scenario[4] ?? [],
    ], $scenarios);
};
