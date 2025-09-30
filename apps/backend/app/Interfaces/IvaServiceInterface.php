<?php

namespace App\Interfaces;

interface IvaServiceInterface
{
    public function getAllIvas();
    public function getIvaById($id);
    public function createIva(array $data);
    public function updateIva($id, array $data);
    public function deleteIva($id);
}