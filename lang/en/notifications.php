<?php

return [
    'date_format' => 'j F Y',

    'producer' => [
        'approved' => ['title' => 'Your producer has been approved', 'body' => '“:producer” is now visible to everyone on the site.'],
        'verified' => ['title' => 'Your profile has been verified', 'body' => '“:producer” now carries the verified producer badge.'],
        'blocked' => ['title' => 'Your producer has been hidden', 'body' => '“:producer” is not visible on the site right now. Contact us if you think this is a mistake.'],
    ],

    'founding' => [
        'granted' => [
            'title' => 'You are founding producer #:number',
            'body' => '“:producer” is among the first producers on the site and gets Premium membership as a gift, until :ends_on.',
        ],
    ],

    'change-request' => [
        'approved' => ['title' => 'Name change approved', 'body' => 'Your producer is now called “:name”.'],
        'rejected' => ['title' => 'Name change not approved', 'body' => 'The name “:name” was not accepted, so the current one stays. Contact us if you need help.'],
    ],

    'product' => [
        'published' => ['title' => ':producer has something new', 'body' => '“:product” has just been listed.'],
        'available' => ['title' => 'It is back: :product', 'body' => '“:product” from “:producer” is available again. We let you know because you asked us to.'],
        'wanted' => ['title' => 'Buyers are waiting: :product', 'body' => 'Buyers waiting for “:product”: :count. As soon as you restock it or its season starts, we will let them know.'],
        'blocked' => ['title' => 'A product has been taken down', 'body' => 'An administrator has taken “:product” off the site. Contact us if you think this is a mistake.'],
    ],

    'review' => [
        'received' => ['title' => 'New review about you', 'body' => 'Someone left a review of “:producer”. It will be published once we check it.'],
        'replied' => ['title' => 'A reply to your review', 'body' => '“:producer” has replied to your review.'],
        'published' => ['title' => 'Your review has been published', 'body' => 'Your review of “:producer” is now visible to everyone.'],
    ],

    'certificate' => [
        'approved' => ['title' => 'Certificate confirmed', 'body' => '“:title” is now shown on your profile.'],
        'rejected' => ['title' => 'Certificate not accepted', 'body' => '“:title”: :reason'],
    ],

    'weekly-pick' => ['title' => 'Producer of the week', 'body' => '“:producer” is producer of the week from :starts_on and will be featured on the home page.'],

    'membership' => [
        'requested' => ['title' => 'Your membership payment slip is ready', 'body' => 'Plan “:plan”, :amount RSD, reference :reference. We activate it as soon as the payment arrives.'],
        'activated' => ['title' => 'Membership activated', 'body' => 'Plan “:plan” is valid until :ends_on.'],
        'ending' => ['title' => 'Your membership ends soon', 'body' => 'Plan “:plan” is valid until :ends_on. You will find the renewal slip on the membership page.'],
        'expired' => ['title' => 'Membership expired', 'body' => 'Plan “:plan” has expired. Your page stays on the site, without the extra benefits until you renew.'],
        'cancelled' => ['title' => 'Membership cancelled', 'body' => 'Plan “:plan” is no longer active. Contact us if you have any questions.'],
    ],

    'boost' => [
        'requested' => ['title' => 'Your boost payment slip is ready', 'body' => '“:name”, :amount RSD, reference :reference. The boost starts as soon as the payment arrives.'],
        'activated' => ['title' => 'Boost activated', 'body' => '“:name” is featured until :ends_on.'],
        'ending' => ['title' => 'Your boost ends tomorrow', 'body' => '“:name” is featured until :ends_on. If you want to continue, a new boost follows on.'],
        'expired' => ['title' => 'Boost ended', 'body' => '“:name” is no longer featured.'],
        'cancelled' => ['title' => 'Boost cancelled', 'body' => '“:name” is no longer featured. Contact us if you have any questions.'],
    ],

    'campaign' => [
        'requested' => ['title' => 'Your campaign payment slip is ready', 'body' => '“:campaign”, :amount RSD, reference :reference. We include you as soon as the payment arrives.'],
        'joined' => ['title' => 'You are in the campaign', 'body' => 'Payment received — your profile is on the “:campaign” campaign page.'],
        'cancelled' => ['title' => 'Campaign place cancelled', 'body' => 'You are no longer on the “:campaign” campaign page. Contact us if you have any questions.'],
    ],

    'admin' => [
        'producer-pending' => ['title' => 'New producer awaiting approval', 'body' => '“:producer” (:city).'],
        'certificate-pending' => ['title' => 'New certificate awaiting review', 'body' => '“:producer” — :title.'],
        'membership-requested' => ['title' => 'New membership payment', 'body' => '“:producer” — plan :plan, :amount RSD, reference :reference.'],
        'boost-requested' => ['title' => 'New boost payment', 'body' => '“:producer” — :name, :amount RSD, reference :reference.'],
        'campaign-requested' => ['title' => 'New campaign sign-up', 'body' => '“:producer” — :campaign, :amount RSD, reference :reference.'],
        'review-pending' => ['title' => 'New review awaiting approval', 'body' => 'About “:producer”, rating :rating/5.'],
        'report-opened' => ['title' => 'New problem report', 'body' => ':subject — :reason_label.'],
        'change-requested' => ['title' => 'Name change request', 'body' => '“:current” wants to be called “:requested”.'],
    ],
];
