<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use Inertia\Inertia;

abstract class TestCase extends BaseTestCase
{
    /**
     * Request a page the way the Inertia client does, so the response is the
     * page object as JSON. Needed when a test cares about something outside
     * the props - such as `clearHistory`, which tells the client to drop the
     * pages it has cached in history state.
     */
    protected function inertiaGet(string $uri): TestResponse
    {
        return $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
        ])->get($uri);
    }
}
