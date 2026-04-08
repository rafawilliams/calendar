<?php
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
require 'vendor/autoload.php';

Flight::route('POST /holiday', function() {

    $data = Flight::request()->data;
    $code = strtoupper(trim((string) $data->country_code));
    $year = (int) $data->year;

    if (!preg_match('/^[A-Z]{2}$/', $code)) {
        Flight::json(['status' => '400', 'error' => 'Invalid country code. Use a 2-letter ISO code (e.g. US, MX).'], 400);
        return;
    }

    $currentYear = (int) date('Y');
    if ($year < 2000 || $year > $currentYear) {
        Flight::json(['status' => '400', 'error' => "Year must be between 2000 and {$currentYear}."], 400);
        return;
    }

    $hapi = new HolidayAPI\v1(getenv('HOLIDAYAPI_KEY'));

    $response = $hapi->holidays([
        'country' => $code,
        'year'    => $year,
    ]);

    Flight::json($response);
});

Flight::start();
