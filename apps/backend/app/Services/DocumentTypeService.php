<?php
namespace App\Services;

use App\Models\DocumentType;
use App\Interfaces\DocumentTypeServiceInterface;

class DocumentTypeService implements DocumentTypeServiceInterface
{
    public function all()
    {
        return DocumentType::all();
    }

    public function find($id)
    {
        return DocumentType::findOrFail($id);
    }

    public function create(array $data)
    {
        return DocumentType::create($data);
    }

    public function update($id, array $data)
    {
        $docType = DocumentType::findOrFail($id);
        $docType->update($data);
        return $docType;
    }

    public function delete($id)
    {
        $docType = DocumentType::findOrFail($id);
        $docType->delete();
        return true;
    }
}