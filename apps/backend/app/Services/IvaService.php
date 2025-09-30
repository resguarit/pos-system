<?php

namespace App\Services;

use App\Models\Iva;
use App\Interfaces\IvaServiceInterface;

class IvaService implements IvaServiceInterface
{
    public function getAllIvas()
    {
        return Iva::all();
    }

    public function createIva(array $data)
    {
        return Iva::create($data);
    }

    public function getIvaById($id)
    {
        return Iva::findOrFail($id);
    }

    public function updateIva($id, array $data)
    {
        $iva = Iva::findOrFail($id);
        $iva->update($data);
        return $iva;
    }

    public function deleteIva($id)
    {
        $iva = Iva::findOrFail($id);
        $iva->delete();
        return $iva;
    }
}