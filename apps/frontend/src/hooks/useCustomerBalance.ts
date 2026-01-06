import { useState, useCallback, useEffect } from 'react'
import useApi from '@/hooks/useApi'
import { CurrentAccount } from '@/types/currentAccount'

interface UseCustomerBalanceResult {
    balance: number | null
    loadingBalance: boolean
    fetchBalance: (customerId: number) => Promise<number | null>
    setBalance: (balance: number | null) => void
}

export function useCustomerBalance(selectedCustomerId?: number): UseCustomerBalanceResult {
    const [balance, setBalance] = useState<number | null>(null)
    const [loadingBalance, setLoadingBalance] = useState(false)
    const { request } = useApi()

    const fetchBalance = useCallback(async (customerId: number): Promise<number | null> => {
        if (!customerId) return null

        setLoadingBalance(true)
        try {
            const response = await request({
                method: 'GET',
                url: `/current-accounts/customer/${customerId}`
            })

            // Normalize response data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let accountData: any = response?.data || response
            if (accountData?.data && typeof accountData.data === 'object') {
                accountData = accountData.data
            }

            const account = accountData as CurrentAccount
            let newBalance = 0

            if (account) {
                if (typeof account.total_pending_debt === 'number') {
                    newBalance = account.total_pending_debt
                } else {
                    newBalance = Number(account.current_balance || 0)
                }
            }

            setBalance(newBalance)
            return newBalance

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error al cargar saldo del cliente:', error)
            if (error?.response?.status === 404) {
                setBalance(0)
                return 0
            } else {
                setBalance(null)
                return null
            }
        } finally {
            setLoadingBalance(false)
        }
    }, [request])

    // Re-fetch balance when window gains focus
    useEffect(() => {
        const handleFocus = () => {
            if (selectedCustomerId) {
                fetchBalance(selectedCustomerId)
            }
        }

        const onFocus = () => handleFocus()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [selectedCustomerId, fetchBalance])

    return {
        balance,
        loadingBalance,
        fetchBalance,
        setBalance
    }
}
