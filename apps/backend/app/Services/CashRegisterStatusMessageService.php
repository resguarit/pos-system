<?php

namespace App\Services;

class CashRegisterStatusMessageService
{
    /**
     * Generar mensaje de estado para múltiples sucursales
     */
    public function generateStatusMessage(array $statusData): string
    {
        if ($statusData['all_open']) {
            return $this->getAllOpenMessage();
        }
        
        if ($statusData['all_closed']) {
            return $this->getAllClosedMessage();
        }
        
        return $this->getMixedStatusMessage($statusData['open_count'], $statusData['closed_count']);
    }

    /**
     * Generar mensaje de estado detallado
     */
    public function generateDetailedMessage(array $statusData): string
    {
        $baseMessage = $this->generateStatusMessage($statusData);
        
        if ($statusData['mixed_status']) {
            $baseMessage .= ' ' . $this->getMixedStatusDetails($statusData);
        }
        
        return $baseMessage;
    }

    /**
     * Mensaje cuando todas las cajas están abiertas
     */
    private function getAllOpenMessage(): string
    {
        return 'Todas las sucursales tienen caja abierta';
    }

    /**
     * Mensaje cuando todas las cajas están cerradas
     */
    private function getAllClosedMessage(): string
    {
        return 'Todas las sucursales tienen caja cerrada';
    }

    /**
     * Mensaje para estado mixto
     */
    private function getMixedStatusMessage(int $openCount, int $closedCount): string
    {
        return "Estado mixto: {$openCount} sucursales con caja abierta, {$closedCount} cerradas";
    }

    /**
     * Detalles adicionales para estado mixto
     */
    private function getMixedStatusDetails(array $statusData): string
    {
        $details = [];
        
        if ($statusData['open_count'] > 0) {
            $details[] = "Puede realizar operaciones en las sucursales con caja abierta";
        }
        
        if ($statusData['closed_count'] > 0) {
            $details[] = "Debe abrir caja en las sucursales cerradas para operaciones";
        }
        
        return implode('. ', $details);
    }
}
