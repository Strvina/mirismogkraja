<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Stranica nije pronađena | Vrelina juga</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=manrope:400,500,600,700|lora:400,500,600,700&display=swap" rel="stylesheet" />

        @vite('resources/css/app.css')
    </head>
    <body class="font-sans antialiased">
        <main class="flex min-h-screen flex-col items-center justify-center bg-background paper-grain px-5 text-center">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Greška 404</p>
            <h1 class="mt-3 font-serif text-4xl sm:text-5xl">Ova stranica ne postoji.</h1>
            <p class="mt-4 max-w-md text-muted-foreground">
                Proizvođač, proizvod ili stranica koju tražiš je uklonjena ili nikad nije postojala.
            </p>
            <a
                href="/"
                class="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
                Nazad na početnu
            </a>
        </main>
    </body>
</html>
