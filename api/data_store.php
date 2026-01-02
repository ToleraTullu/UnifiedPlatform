<?php
/**
 * DataStore.php
 * Simple JSON-based data store helper
 */

class DataStore
{
    private $dataDir;

    public function __construct()
    {
        // Assume 'data' folder is one level up from 'api'
        $this->dataDir = __DIR__ . '/../data/';
        if (!file_exists($this->dataDir)) {
            mkdir($this->dataDir, 0777, true);
        }
    }

    public function get($key)
    {
        $file = $this->dataDir . $key . '.json';
        if (!file_exists($file))
            return [];
        $content = file_get_contents($file);
        return json_decode($content, true) ?: [];
    }

    public function save($key, $data)
    {
        $file = $this->dataDir . $key . '.json';
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
        return true;
    }

    public function add($key, $item)
    {
        $data = $this->get($key);
        // Ensure data is array
        if (!is_array($data))
            $data = [];

        // Add ID if missing
        if (!isset($item['id'])) {
            $item['id'] = time() . rand(100, 999);
        }

        $data[] = $item;
        $this->save($key, $data);
        return $item; // Return added item with ID
    }
}
