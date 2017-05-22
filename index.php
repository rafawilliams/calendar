<?php
require 'vendor/autoload.php';

Flight::route('POST /holyday', function(){

    $hapi = new HolidayAPI\v1('5a56524c-a8ff-4a50-a9af-5a088d594921');
   
    $code = Flight::request()->data->country_code;
    $year = Flight::request()->data->year;

    $parameters = array(
       'country' => $code,
       'year'    => $year,
    );

    if($year == '2008'){ 
      $response = $hapi->holidays($parameters);
      Flight::json($response);
    }

});

Flight::start();