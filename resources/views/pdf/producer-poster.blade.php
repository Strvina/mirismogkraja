{{--
    The poster for a market stall (App\Services\ProducerPosterPdf). Big type
    and a big code: it is read from a step or two away, often in sunlight.
    DejaVu Sans, which dompdf ships, for č, ć, š, ž and đ.
--}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <title>{{ $producer->name }}</title>
    <style>
        @page { margin: 16mm; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #2b2420;
            text-align: center;
        }

        .brand {
            font-size: 11pt;
            letter-spacing: 3pt;
            text-transform: uppercase;
            color: #9a3b26;
            margin: 0;
        }

        .logo {
            width: 30mm;
            height: 30mm;
            border-radius: 15mm;
            margin: 8mm auto 0;
        }

        h1 {
            font-size: 30pt;
            line-height: 1.15;
            margin: 8mm 0 2mm;
        }

        .city {
            font-size: 14pt;
            color: #6b625c;
            margin: 0;
        }

        .qr {
            width: 105mm;
            height: 105mm;
            margin: 10mm auto 6mm;
        }

        .call {
            font-size: 20pt;
            font-weight: bold;
            margin: 0;
        }

        .hint {
            font-size: 12pt;
            color: #6b625c;
            margin: 3mm 0 0;
        }

        .url {
            font-size: 9pt;
            color: #6b625c;
            margin-top: 10mm;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <p class="brand">{{ config('app.name') }}</p>

    @if ($logo)
        <img class="logo" src="{{ $logo }}" alt="">
    @endif

    <h1>{{ $producer->name }}</h1>

    @if ($producer->city)
        <p class="city">{{ $producer->city }}</p>
    @endif

    <img class="qr" src="{{ $qr }}" alt="">

    <p class="call">{{ __('Skenirajte i pišite nam') }}</p>
    <p class="hint">{{ __('Naši proizvodi, cene i poruke direktno nama — i kada nismo na pijaci.') }}</p>

    <p class="url">{{ route('marketplace.producers.show', $producer->slug) }}</p>
</body>
</html>
