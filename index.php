<?php
require 'vendor/autoload.php';

Flight::route('POST /holyday', function(){

    $hapi = new HolidayAPI\v1('472993c6-5d7c-47d8-9cce-922b03ff39d3');
    $year = Flight::get('year');
    $code = Flight::get('country_code');
    
    $parameters = array(
       'country' => 'US',
       'year'    => 2016,
);

if($year != '2008'){ 
  $response = $hapi->holidays($parameters);
}

});

Flight::start();