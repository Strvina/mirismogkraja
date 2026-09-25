{{--
    The Serbian "nalog za uplatu" form, laid out the way the paper one is so
    a producer can hand it over at a counter without explaining anything.

    Built as HTML for dompdf rather than drawn with PDF primitives: the form
    is a table of boxes, which is what HTML is already good at, and DejaVu
    Sans - which dompdf ships - is the part that matters, since Helvetica has
    no č, ć, š, ž or đ and would silently mangle every other producer's name.
--}}
<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="utf-8">
    <title>Nalog za uplatu — {{ $slip['reference'] }}</title>
    <style>
        @page { margin: 14mm; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9pt;
            color: #000;
        }

        h1 {
            font-size: 13pt;
            text-align: center;
            letter-spacing: 1pt;
            margin: 0 0 6mm;
            text-transform: uppercase;
        }

        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }

        .label {
            font-size: 7pt;
            padding-bottom: 1mm;
        }

        .box {
            border: 0.4mm solid #000;
            padding: 2mm;
            min-height: 12mm;
        }

        .value { font-size: 10pt; }

        .small-box { border: 0.4mm solid #000; padding: 1.5mm 2mm; }

        .gap { height: 3mm; }
        .col-gap { width: 4mm; }

        .footer td { padding-top: 2mm; }
        .footer .small-box { min-height: 14mm; }

        .qr { text-align: center; }
        .qr img { width: 30mm; height: 30mm; }
        .qr div { font-size: 6.5pt; padding-top: 1mm; }

        .note {
            font-size: 7pt;
            color: #444;
            padding-top: 4mm;
        }
    </style>
</head>
<body>
    <h1>Nalog za uplatu</h1>

    <table>
        <tr>
            {{-- Left column: who pays, what for, who receives. --}}
            <td style="width: 58%">
                <div class="label">platilac</div>
                <div class="box value">{{ $slip['payer'] }}</div>

                <div class="gap"></div>

                <div class="label">svrha uplate</div>
                <div class="box value">{{ $slip['purpose'] }}</div>

                <div class="gap"></div>

                <div class="label">primalac</div>
                <div class="box value">
                    {{ $slip['recipient'] }}
                    @if ($slip['recipient_address'])
                        <br>{{ $slip['recipient_address'] }}
                    @endif
                </div>
            </td>

            <td class="col-gap"></td>

            {{-- Right column: the numbers the bank keys in. --}}
            <td>
                <table>
                    <tr>
                        <td style="width: 28%">
                            <div class="label">šifra plaćanja</div>
                            <div class="small-box value">{{ $slip['payment_code'] }}</div>
                        </td>
                        <td style="width: 4%"></td>
                        <td style="width: 24%">
                            <div class="label">valuta</div>
                            <div class="small-box value">RSD</div>
                        </td>
                        <td style="width: 4%"></td>
                        <td>
                            <div class="label">iznos</div>
                            <div class="small-box value">={{ $slip['amount'] }}</div>
                        </td>
                    </tr>
                </table>

                <div class="gap"></div>

                <div class="label">račun primaoca</div>
                <div class="small-box value">{{ $slip['account'] }}</div>

                <div class="gap"></div>

                <table>
                    <tr>
                        <td style="width: 18%">
                            <div class="label">model</div>
                            <div class="small-box value">{{ $slip['model'] }}</div>
                        </td>
                        <td style="width: 4%"></td>
                        <td>
                            <div class="label">poziv na broj (odobrenje)</div>
                            <div class="small-box value">{{ $slip['reference'] }}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="footer">
        <tr>
            <td style="width: 34%">
                <div class="label">pečat i potpis uplatioca</div>
                <div class="small-box"></div>
            </td>
            <td class="col-gap"></td>
            <td style="width: 24%">
                <div class="label">mesto i datum prijema</div>
                <div class="small-box"></div>
            </td>
            <td class="col-gap"></td>
            <td style="width: 20%">
                <div class="label">datum valute</div>
                <div class="small-box"></div>
            </td>
            <td class="col-gap"></td>
            <td class="qr">
                <img src="{{ $qr }}" alt="IPS QR">
                <div>IPS QR</div>
            </td>
        </tr>
    </table>

    <p class="note">
        Skeniranjem IPS QR koda u aplikaciji vaše banke popunjavaju se račun, iznos i poziv na broj.
        Poziv na broj je ono po čemu prepoznajemo vašu uplatu — molimo vas da ga ne menjate.
    </p>
</body>
</html>
