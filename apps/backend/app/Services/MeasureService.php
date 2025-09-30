<?php

namespace App\Services;

use App\Models\Measure;
use App\Interfaces\MeasureServiceInterface;

class MeasureService implements MeasureServiceInterface
{
    public function getAllMeasures()
    {
        return Measure::all();
    }

    public function createMeasure(array $data)
    {
        return Measure::create($data);
    }

    public function getMeasureById($id)
    {
        return Measure::findOrFail($id);
    }

    public function updateMeasure($id, array $data)
    {
        $measure = Measure::findOrFail($id);
        $measure->update($data);
        return $measure;
    }

    public function deleteMeasure($id)
    {
        $measure = Measure::findOrFail($id);
        $measure->delete();
        return $measure;
    }
}