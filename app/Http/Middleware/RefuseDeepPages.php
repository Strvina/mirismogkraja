<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A public list is not read past a few hundred pages, only crawled - and an
 * OFFSET that deep makes the database walk every row before it. Deeper than
 * this there is no page.
 *
 * On the routes of the public lists ("deep-pages" in the route files), so
 * no controller has to remember it.
 */
class RefuseDeepPages
{
    public const MAX_PAGE = 500;

    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->integer('page') > self::MAX_PAGE, 404);

        return $next($request);
    }
}
