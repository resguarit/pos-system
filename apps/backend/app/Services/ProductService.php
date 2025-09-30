<?php

namespace App\Services;

use App\Interfaces\ProductServiceInterface;
use App\Models\Product;
use App\Models\Category;
use App\Models\Iva;
use App\Models\Measure;
use App\Models\Supplier;
use App\Models\Stock;
use App\Models\Branch;
use Exception;
use Illuminate\Support\Facades\Log;

class ProductService implements ProductServiceInterface
{
    public function getAllProducts()
    {
        try {
            return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])
                ->where('status', true) // Solo productos activos
                ->get();
        } catch (Exception $e) {
            Log::error('Error fetching all products: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function getAllProductsForAdmin()
    {
        try {
            return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])->get();
        } catch (Exception $e) {
            Log::error('Error fetching all products for admin: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function createProduct(array $data)
    {
        // Crear el producto
        $product = Product::create($data);
        
        // Crear stock automáticamente
        if (isset($data['branch_ids']) && is_array($data['branch_ids'])) {
            // Crear stock en sucursales específicas
            foreach ($data['branch_ids'] as $branchId) {
                Stock::create([
                    'product_id' => $product->id,
                    'branch_id' => $branchId,
                    'current_stock' => 0,
                    'min_stock' => $data['min_stock'] ?? 0,
                    'max_stock' => $data['max_stock'] ?? 0
                ]);
            }
            unset($data['branch_ids']); // Remover del array para no guardarlo en el producto
            unset($data['min_stock']); // Remover del array para no guardarlo en el producto
            unset($data['max_stock']); // Remover del array para no guardarlo en el producto
        } elseif (isset($data['branch_id'])) {
            // Crear stock en una sola sucursal (compatibilidad)
            $branchId = $data['branch_id'];
            unset($data['branch_id']); // Remover del array para no guardarlo en el producto
            
            Stock::create([
                'product_id' => $product->id,
                'branch_id' => $branchId,
                'current_stock' => 0,
                'min_stock' => $data['min_stock'] ?? 0,
                'max_stock' => $data['max_stock'] ?? 0
            ]);
        } else {
            // Crear stock en todas las sucursales activas
            $branches = Branch::where('status', 1)->get();
            foreach ($branches as $branch) {
                Stock::create([
                    'product_id' => $product->id,
                    'branch_id' => $branch->id,
                    'current_stock' => 0,
                    'min_stock' => $data['min_stock'] ?? 0,
                    'max_stock' => $data['max_stock'] ?? 0
                ]);
            }
        }
        
        return $product;
    }

    public function getProductById($id)
    {
        return Product::with(['measure', 'category', 'iva', 'supplier', 'stocks'])->findOrFail($id);
    }

    public function updateProduct($id, array $data)
    {
        Log::info('ProductService::updateProduct - INICIO');
        Log::info('ProductService::updateProduct - Product ID: ' . $id);
        Log::info('ProductService::updateProduct - Data recibida: ', $data);
        
        // Logging específico para status y web
        if (array_key_exists('status', $data)) {
            Log::info('ProductService::updateProduct - Status recibido: ' . var_export($data['status'], true) . ' (tipo: ' . gettype($data['status']) . ')');
        }
        if (array_key_exists('web', $data)) {
            Log::info('ProductService::updateProduct - Web recibido: ' . var_export($data['web'], true) . ' (tipo: ' . gettype($data['web']) . ')');
        }
        
        $product = Product::findOrFail($id);
        
        // Log valores actuales antes de actualizar
        Log::info('ProductService::updateProduct - Valores actuales - Status: ' . var_export($product->status, true) . ', Web: ' . var_export($product->web, true));
        
        // Separar los datos de stock de los datos del producto
        $stockData = [];
        if (isset($data['min_stock'])) {
            $stockData['min_stock'] = $data['min_stock'];
            unset($data['min_stock']);
            Log::info('ProductService::updateProduct - min_stock extraído: ' . $stockData['min_stock']);
        }
        if (isset($data['max_stock'])) {
            $stockData['max_stock'] = $data['max_stock'];
            unset($data['max_stock']);
            Log::info('ProductService::updateProduct - max_stock extraído: ' . $stockData['max_stock']);
        }
        
        Log::info('ProductService::updateProduct - stockData final: ', $stockData);
        
        // Actualizar los campos del producto
        foreach ($data as $key => $value) {
            $oldValue = $product->$key ?? null;
            $product->$key = $value;
            
            // Log específico para status y web
            if ($key === 'status' || $key === 'web') {
                Log::info("ProductService::updateProduct - Campo '$key' actualizado de " . var_export($oldValue, true) . " a " . var_export($value, true));
            }
        }
        $product->save();
        
        // Log valores después de guardar
        $product->refresh();
        Log::info('ProductService::updateProduct - Valores después de guardar - Status: ' . var_export($product->status, true) . ', Web: ' . var_export($product->web, true));
        
        // Actualizar o crear stocks en todas las sucursales
        if (!empty($stockData)) {
            Log::info('ProductService::updateProduct - Iniciando actualización de stocks...');
            $branches = Branch::all();
            Log::info('ProductService::updateProduct - Sucursales encontradas: ' . $branches->count());
            
            foreach ($branches as $branch) {
                Log::info('ProductService::updateProduct - Procesando sucursal: ' . $branch->id);
                
                $stock = Stock::firstOrCreate(
                    [
                        'product_id' => $product->id,
                        'branch_id' => $branch->id
                    ],
                    [
                        'current_stock' => 0,
                        'min_stock' => $stockData['min_stock'] ?? 0,
                        'max_stock' => $stockData['max_stock'] ?? 0
                    ]
                );
                
                
                // Si ya existe, actualizar solo los campos min/max
                if (!$stock->wasRecentlyCreated) {
                    $needsUpdate = false;
                    if (array_key_exists('min_stock', $stockData)) {
                        $oldMin = $stock->min_stock;
                        $stock->min_stock = $stockData['min_stock'];
                        $needsUpdate = true;
                        Log::info('ProductService::updateProduct - min_stock actualizado de ' . $oldMin . ' a ' . $stockData['min_stock']);
                    }
                    if (array_key_exists('max_stock', $stockData)) {
                        $oldMax = $stock->max_stock;
                        $stock->max_stock = $stockData['max_stock'];
                        $needsUpdate = true;
                        Log::info('ProductService::updateProduct - max_stock actualizado de ' . $oldMax . ' a ' . $stockData['max_stock']);
                    }
                    
                    if ($needsUpdate) {
                        $stock->save();
                        Log::info('ProductService::updateProduct - Stock guardado exitosamente');
                    } else {
                        Log::info('ProductService::updateProduct - No hay cambios de stock para guardar');
                    }
                } else {
                    Log::info('ProductService::updateProduct - Stock recién creado, no necesita actualización adicional');
                }
            }
            
            Log::info("Updated stocks for product {$product->id}: " . json_encode($stockData));
        } else {
            Log::info('ProductService::updateProduct - NO HAY DATOS DE STOCK PARA ACTUALIZAR');
        }
        
        $product->refresh();
        
        Log::info("Product after update: " . json_encode($product->toArray()));
        Log::info('ProductService::updateProduct - FIN');
        
        return $product;
    }

    public function deleteProduct($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return $product;
    }

    public function getAllCategories()
    {
        // Para productos, es mejor obtener las categorías con estructura jerárquica
        return Category::with(['parent', 'children'])->get();
    }

    public function getAllIvas()
    {
        return Iva::all();
    }

    public function getAllMeasures()
    {
        return Measure::all();
    }

    public function getAllSuppliers()
    {
        return Supplier::all();
    }

    public function getAllBranches()
    {
        return Branch::all();
    }
}