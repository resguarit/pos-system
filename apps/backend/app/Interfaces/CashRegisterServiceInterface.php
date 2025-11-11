<?php

namespace App\Interfaces;

use Illuminate\Http\Request;

interface CashRegisterServiceInterface
{
    public function openCashRegister(array $data);
    public function closeCashRegister(int $id, array $data);
    public function getCurrentCashRegister(int $branchId);
    public function getMultipleBranchesCashRegisterStatus(array $branchIds);
    public function getCashRegisterHistory(Request $request);
    public function getCashRegisterById(int $id);
    public function getLastClosure(int $branchId): ?float;
}
