<?php

namespace App\Services;

use App\Interfaces\FiscalConditionServiceInterface;
use App\Models\FiscalCondition;

class FiscalConditionService implements FiscalConditionServiceInterface
{
    /**
     * Get all fiscal conditions.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getFiscalConditions()
    {
        return FiscalCondition::all();
    }

    // Additional methods for creating, updating, and deleting fiscal conditions can be added here
}