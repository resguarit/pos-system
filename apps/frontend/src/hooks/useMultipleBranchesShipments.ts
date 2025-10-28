import { useState, useCallback } from "react"
import useApi from "@/hooks/useApi"
import { Shipment } from "@/types/shipment"

interface UseMultipleBranchesShipmentsProps {
  selectedBranchIdsArray: number[]
}

interface ShipmentFilters {
  stage_id?: string
  reference?: string
  created_from?: string
  created_to?: string
  priority?: string
  city?: string
  customer?: string
  transporter?: string
  per_page?: number
}

export const useMultipleBranchesShipments = ({ selectedBranchIdsArray }: UseMultipleBranchesShipmentsProps) => {
  const { request } = useApi()
  
  // Estados para múltiples sucursales
  const [allShipments, setAllShipments] = useState<Shipment[]>([])
  const [allShipmentsLoading, setAllShipmentsLoading] = useState(false)
  const [consolidatedStats, setConsolidatedStats] = useState<any>({})

  // Función para cargar datos consolidados de múltiples sucursales
  const loadMultipleBranchesShipments = useCallback(async (filters?: ShipmentFilters) => {
    if (selectedBranchIdsArray.length === 0) {
      return
    }
    
    try {
      setAllShipmentsLoading(true)
      
      const requestParams: any = {
        branch_ids: selectedBranchIdsArray,
        per_page: filters?.per_page || 15
      }
      
      // Agregar filtros si existen
      if (filters) {
        if (filters.stage_id) requestParams.stage_id = filters.stage_id
        if (filters.reference) requestParams.reference = filters.reference
        if (filters.created_from) requestParams.created_from = filters.created_from
        if (filters.created_to) requestParams.created_to = filters.created_to
        if (filters.priority) requestParams.priority = filters.priority
        if (filters.city) requestParams.city = filters.city
        if (filters.customer) requestParams.customer = filters.customer
        if (filters.transporter) requestParams.transporter = filters.transporter
      }
      
      const response = await request({
        method: 'GET',
        url: `/shipments/multiple-branches`,
        params: requestParams
      })
      
      // useApi devuelve response.data, entonces response ya es {data: {...}, stats: {...}}
      const data = response?.data;
      const stats = response?.stats;
      
      let shipmentsList: Shipment[] = [];
      
      // Extraer shipments de data
      if (data?.success && data.data) {
        // Formato envuelto: { success: true, data: { current_page, data, ... }, stats: {...} }
        const paginatedData = data.data;
        if (Array.isArray(paginatedData?.data)) {
          shipmentsList = paginatedData.data;
        } else if (Array.isArray(paginatedData)) {
          shipmentsList = paginatedData;
        }
      } else if (data?.data && Array.isArray(data.data)) {
        // Formato directo paginado: { current_page: 1, data: [...], ... }
        shipmentsList = data.data;
      } else if (Array.isArray(data)) {
        // Formato array directo
        shipmentsList = data;
      } else if (data && 'current_page' in data) {
        // Estructura Laravel pagination
        shipmentsList = Array.isArray(data.data) ? data.data : [];
      }
      
      setAllShipments(shipmentsList);
      
      // Actualizar estadísticas consolidadas si existen
      if (stats) {
        setConsolidatedStats(stats)
      }
    } catch (error) {
      console.error('❌ Error loading multiple branches shipments:', error)
      setAllShipments([])
    } finally {
      setAllShipmentsLoading(false)
    }
  }, [selectedBranchIdsArray, request])

  return {
    allShipments,
    allShipmentsLoading,
    consolidatedStats,
    loadMultipleBranchesShipments
  }
}

