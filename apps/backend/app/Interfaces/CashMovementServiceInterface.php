<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface CashMovementServiceInterface
{
    public function createMovement(array $data);
    public function getMovementsByRegister(int $cashRegisterId, Request $request);
    public function getMovementById(int $id);
    public function deleteMovement(int $id);
    public function createSaleMovement(int $cashRegisterId, array $saleData);
}
