<?php

namespace HolidayAPI;

class v1
{
    private $key;
    private $baseUrl = 'https://holidayapi.com/v1/';

    public function __construct($key)
    {
        $this->key = $key;
    }

    public function holidays(array $parameters)
    {
        $parameters['key'] = $this->key;
        $url = $this->baseUrl . 'holidays?' . http_build_query($parameters);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['status' => '500', 'error' => 'Connection error'];
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            return ['status' => (string)$httpCode, 'error' => $data['error'] ?? 'API error'];
        }

        // Indexar holidays por fecha para facilitar el lookup en frontend
        $indexed = [];
        if (!empty($data['holidays'])) {
            foreach ($data['holidays'] as $holiday) {
                $indexed[$holiday['date']][] = $holiday;
            }
        }

        return ['holidays' => $indexed];
    }
}
