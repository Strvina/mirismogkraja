<?php

namespace App\Http\Middleware;

use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * "throttle:5,1" as the routes mean it: five a minute of *this* request.
 *
 * Laravel's own middleware counts per person (or per address, for a
 * guest), not per route - so every throttled route shared one counter. A
 * buyer who had just sent five messages was refused when posting a review,
 * and a visitor who clicked a few contact buttons could not register. Here
 * the route is part of what is counted.
 */
class ThrottlePerRoute extends ThrottleRequests
{
    protected function resolveRequestSignature($request)
    {
        $route = $request->route();

        return sha1(parent::resolveRequestSignature($request).'|'.($route?->getName() ?? $route?->uri()));
    }
}
