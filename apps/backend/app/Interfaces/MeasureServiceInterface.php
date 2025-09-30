<?php

namespace App\Interfaces;

interface MeasureServiceInterface
{
    public function getAllMeasures();
    public function getMeasureById($id);
    public function createMeasure(array $data);
    public function updateMeasure($id, array $data);
    public function deleteMeasure($id);
}