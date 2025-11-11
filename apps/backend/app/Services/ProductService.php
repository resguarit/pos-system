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
use Illuminate\Support\Facades\DB;

class ProductService implements ProductServiceInterface
{
    /**
     * Helper method para recalcular el precio de venta
     */
    private function recalculateSalePrice($product)
    {
        try {
            $pricingService = app(\App\Services\PricingService::class);
            
            // Obtener el IVA rate como decimal
            $ivaRate = null;
            if ($product->iva_id) {
                $iva = \App\Models\Iva::find($product->iva_id);
                $ivaRate = $iva ? $iva->rate / 100 : null;
            }
            
            // Calcular el nuevo precio de venta usando el markup actual
            $newSalePrice = $pricingService->calculateSalePrice(
                (float) $product->unit_price,
                $product->currency,
                (float) $product->markup,
                $ivaRate
            );
            
            // Actualizar solo el sale_price sin disparar eventos adicionales
            $product->setAttribute('sale_price', $newSalePrice);
            $product->saveQuietly(); // Usar saveQuietly para evitar loops
        } catch (Exception $e) {
            Log::error("Error recalculando precio de venta para producto {$product->id}: " . $e->getMessage());
            // No lanzar excepción para no interrumpir el proceso
        }
    }

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
        // Validar y corregir markup negativo antes de crear
        if (isset($data['markup']) && $data['markup'] < 0) {
            Log::warning("ProductService::createProduct - Markup negativo detectado: {$data['markup']}, corrigiendo a 0");
            $data['markup'] = 0.0;
        }
        
        // Crear el producto
        $product = Product::create($data);
        
        // Crear stock automáticamente
        if (isset($data['branch_ids']) && is_array($data['branch_ids']) && !empty($data['branch_ids'])) {
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
        
        // Validar y corregir markup negativo antes de guardar
        if (isset($data['markup']) && $data['markup'] < 0) {
            Log::warning("ProductService::updateProduct - Markup negativo detectado: {$data['markup']}, corrigiendo a 0");
            $data['markup'] = 0.0;
        }
        
        // Actualizar los campos del producto
        foreach ($data as $key => $value) {
            $oldValue = $product->$key ?? null;
            
            // Validar markup antes de asignar
            if ($key === 'markup' && $value < 0) {
                Log::warning("ProductService::updateProduct - Markup negativo detectado en campo: {$value}, corrigiendo a 0");
                $value = 0.0;
            }
            
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

    public function bulkUpdatePrices(array $updates)
    {
        return DB::transaction(function () use ($updates) {
            $updatedCount = 0;
            $failedUpdates = [];

            foreach ($updates as $update) {
                try {
                    $product = Product::findOrFail($update['id']);
                    $oldPrice = $product->unit_price;
                    
                    // Actualizar el precio unitario
                    $product->update([
                        'unit_price' => $update['unit_price']
                    ]);
                    
                    // Recalcular el precio de venta
                    $this->recalculateSalePrice($product);

                    Log::info('Bulk price update', [
                        'product_id' => $product->id,
                        'product_description' => $product->description,
                        'old_price' => $oldPrice,
                        'new_price' => $update['unit_price'],
                        'new_sale_price' => $product->sale_price,
                        'currency' => $product->currency
                    ]);

                    $updatedCount++;
                } catch (Exception $e) {
                    $failedUpdates[] = [
                        'product_id' => $update['id'],
                        'error' => $e->getMessage()
                    ];
                    
                    Log::error('Failed bulk price update', [
                        'product_id' => $update['id'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'failed_updates' => $failedUpdates,
                'message' => "Se actualizaron {$updatedCount} productos correctamente"
            ];
        });
    }

    public function bulkUpdatePricesByCategory(array $categoryIds, string $updateType, float $value)
    {
        return DB::transaction(function () use ($categoryIds, $updateType, $value) {
            $products = Product::whereIn('category_id', $categoryIds)->get();

            if ($products->isEmpty()) {
                throw new Exception('No se encontraron productos en las categorías seleccionadas');
            }

            foreach ($products as $product) {
                $oldPrice = $product->unit_price;
                $newPrice = $this->calculateNewPrice($oldPrice, $updateType, $value);
                
                // Actualizar el precio unitario
                $product->update([
                    'unit_price' => $newPrice
                ]);
                
                // Recalcular el precio de venta
                $this->recalculateSalePrice($product);

                Log::info('Bulk category price update', [
                    'product_id' => $product->id,
                    'product_description' => $product->description,
                    'category_id' => $product->category_id,
                    'update_type' => $updateType,
                    'value' => $value,
                    'old_price' => $oldPrice,
                    'new_price' => $newPrice,
                    'new_sale_price' => $product->sale_price,
                    'currency' => $product->currency
                ]);
            }

            return [
                'success' => true,
                'updated_count' => $products->count(),
                'message' => "Se actualizaron {$products->count()} productos de las categorías seleccionadas"
            ];
        });
    }

    public function bulkUpdatePricesBySupplier(array $supplierIds, string $updateType, float $value)
    {
        return DB::transaction(function () use ($supplierIds, $updateType, $value) {
            $products = Product::whereIn('supplier_id', $supplierIds)->where('status', true)->get();

            if ($products->isEmpty()) {
                throw new Exception('No se encontraron productos para los proveedores especificados');
            }

            $updatedCount = 0;
            foreach ($products as $product) {
                $oldPrice = $product->unit_price;
                $newPrice = $this->calculateNewPrice($oldPrice, $updateType, $value);
                
                // Actualizar el precio unitario
                $product->update(['unit_price' => $newPrice]);
                
                // Recalcular el precio de venta
                $this->recalculateSalePrice($product);
                
                $updatedCount++;
            }

            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'message' => "Se actualizaron {$updatedCount} productos correctamente"
            ];
        });
    }

    private function calculateNewPrice($currentPrice, $updateType, $value)
    {
        switch ($updateType) {
            case 'percentage':
                return $currentPrice * (1 + $value / 100);
            case 'fixed':
                return $currentPrice + $value;
            default:
                return $currentPrice;
        }
    }
}
