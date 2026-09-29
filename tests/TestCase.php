<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Symfony's test requests claim an English browser by default, and
        // the site answers a browser in its own language. The suite reads
        // the site as a Serbian visitor does; tests of the other languages
        // say so themselves.
        $this->withHeader('Accept-Language', 'sr');
    }
}
