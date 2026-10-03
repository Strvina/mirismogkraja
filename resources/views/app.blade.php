<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @php($meta = $page['props']['meta'] ?? null)
        <title inertia>{{ $meta['title'] ?? config('app.name', 'Laravel') }}</title>

        {{-- Link previews and search results read this first response and
             never run JavaScript, so a page's own description is written
             here rather than by React. See App\Support\PageMeta. --}}
        @if ($meta)
            <meta name="description" content="{{ $meta['description'] }}">
            <link rel="canonical" href="{{ $meta['url'] }}">
            <meta property="og:site_name" content="{{ config('app.name') }}">
            <meta property="og:type" content="{{ $meta['type'] }}">
            <meta property="og:title" content="{{ $meta['title'] }}">
            <meta property="og:description" content="{{ $meta['description'] }}">
            <meta property="og:url" content="{{ $meta['url'] }}">
            <meta property="og:locale" content="{{ \App\Support\PageMeta::OG_LOCALES[app()->getLocale()] ?? 'sr_RS' }}">
            @if ($meta['image'])
                <meta property="og:image" content="{{ $meta['image'] }}">
                <meta name="twitter:card" content="summary_large_image">
            @endif
            @if (! empty($meta['structured']))
                {{-- JSON_HEX_TAG turns < and > into escapes, so no value can close the tag early. --}}
                <script type="application/ld+json">{!! json_encode($meta['structured'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
            @endif
        @endif

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=manrope:400,500,600,700|lora:400,500,600,700&display=swap" rel="stylesheet" />

        {{-- The admin panel's routes only for admins; see config/ziggy.php. --}}
        @routes(auth()->user()?->hasRole('admin') ? null : 'public')
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
