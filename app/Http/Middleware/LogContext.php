<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Says, on every line the application logs while answering a request,
 * which request it was and whose: an id of its own, the route, and the
 * signed-in user's id (never a name or an address).
 *
 * The id also goes back in the X-Request-Id header, so a visitor's report
 * ("it broke at ten past nine") can be matched to its lines in the log.
 */
class LogContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) Str::uuid();

        Context::add([
            'request_id' => $id,
            'route' => $request->route()?->getName(),
            'user_id' => $request->user()?->id,
        ]);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $id);

        return $response;
    }
}
