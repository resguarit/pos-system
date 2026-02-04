import { useState, useEffect, useCallback } from 'react'
import useApi from '@/hooks/useApi'


/** Identidad fiscal (CUIT) del cliente para elegir en POS o al autorizar ARCA */
export interface TaxIdentityOption {
  id: number
  cuit: string
  business_name: string
  fiscal_condition_id: number
  fiscal_condition?: { id: number; name: string }
  is_default: boolean
}

export interface CustomerOption {
  id: number
  name: string
  dni: string | null
  cuit: string | null
  fiscal_condition_id: number | null
  fiscal_condition_name: string | null
  /** Lista de CUITs del cliente; si tiene más de uno, el usuario puede elegir cuál usar */
  tax_identities?: TaxIdentityOption[]
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
    const taxIdentitiesList = (customer.tax_identities ?? []).map((t: any) => ({
      id: t.id,
      cuit: t.cuit ?? '',
      business_name: t.business_name ?? '',
      fiscal_condition_id: t.fiscal_condition_id ?? 1,
      fiscal_condition: t.fiscal_condition,
      is_default: !!t.is_default,
    }))
    const defaultTaxIdentity = taxIdentitiesList.find((t: TaxIdentityOption) => t.is_default) ?? taxIdentitiesList[0]
    const fiscalConditionId = defaultTaxIdentity?.fiscal_condition_id ?? customer.person?.fiscal_condition_id ?? null
    const fiscalConditionName = defaultTaxIdentity?.fiscal_condition?.name ?? customer.person?.fiscal_condition?.description ?? customer.person?.fiscal_condition?.name ?? null
    const cuitFromDefault = defaultTaxIdentity?.cuit ?? (hasCuit ? customer.person.cuit : null)

    return {
      id: customer.id,
      name: customer.person
        ? [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' ')
        : `Cliente ${customer.id}`,
      dni: hasDni ? customer.person.documento : null,
      cuit: cuitFromDefault ?? null,
      fiscal_condition_id: fiscalConditionId,
      fiscal_condition_name: fiscalConditionName,
      tax_identities: taxIdentitiesList.length > 0 ? taxIdentitiesList : undefined,
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




