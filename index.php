<?php
require 'vendor/autoload.php';

Flight::route('POST /holyday', function(){

    $hapi = new HolidayAPI\v1('472993c6-5d7c-47d8-9cce-922b03ff39d3');
   
    $code = Flight::request()->data->country_code;
    $year = Flight::request()->data->year;

    $parameters = array(
       'country' => $code,
       'year'    => $year,
    );

    if($year != '2008'){ 
      $response = $hapi->holidays($parameters);
      Flight::json($response);
    }

});

Flight::start();