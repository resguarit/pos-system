import { useState, useEffect, useCallback } from 'react'
import useApi from '@/hooks/useApi'
import { toast } from 'sonner'

export interface CustomerOption {
  id: number
  name: string
  dni: string | null
  cuit: string | null
  fiscal_condition_id: number | null
  fiscal_condition_name: string | null
}

interface CustomerSearchResult {
  selectedCustomer: CustomerOption | null
  customerSearch: string
  customerOptions: CustomerOption[]
  showCustomerOptions: boolean
  setSelectedCustomer: (customer: CustomerOption | null) => void
  setCustomerSearch: (search: string) => void
  setShowCustomerOptions: (show: boolean) => void
}

/**
 * Hook personalizado para manejar la búsqueda y selección de clientes
 */
export const useCustomerSearch = (): CustomerSearchResult => {
  const { request } = useApi()
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [showCustomerOptions, setShowCustomerOptions] = useState(false)

  const mapCustomerToOption = useCallback((customer: any): CustomerOption => {
    const hasCuit = customer.person?.cuit
    const hasDni = customer.person?.documento

    return {
      id: customer.id,
      name: customer.person
        ? [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' ')
        : `Cliente ${customer.id}`,
      dni: hasDni ? customer.person.documento : null,
      cuit: hasCuit ? customer.person.cuit : null,
      fiscal_condition_id: customer.person?.fiscal_condition_id || null,
      fiscal_condition_name: customer.person?.fiscal_condition?.description ||
        customer.person?.fiscal_condition?.name || null,
    }
  }, [])

  useEffect(() => {
    if (!showCustomerOptions) {
      setCustomerOptions([])
      return
    }

    if (customerSearch.length < 3) {
      setCustomerOptions([])
      return
    }

    const fetchCustomers = async () => {
      try {
        const response = await request({
          method: 'GET',
          url: `/customers?search=${encodeURIComponent(customerSearch)}`
        })
        const customers = Array.isArray(response) ? response : response?.data ?? []
        const mappedCustomers = customers.map(mapCustomerToOption)
        setCustomerOptions(mappedCustomers)
      } catch (error) {
        console.error('Error fetching customers:', error)
        setCustomerOptions([])
      }
    }

    const debounceTimer = setTimeout(() => {
      fetchCustomers()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [customerSearch, showCustomerOptions, request, mapCustomerToOption])

  const handleSetCustomerSearch = useCallback((search: string) => {
    setCustomerSearch(search)
    setShowCustomerOptions(!!search && search.length >= 1)
    if (!search) {
      setSelectedCustomer(null)
    }
  }, [])

  return {
    selectedCustomer,
    customerSearch,
    customerOptions,
    showCustomerOptions,
    setSelectedCustomer,
    setCustomerSearch: handleSetCustomerSearch,
    setShowCustomerOptions,
  }
}




