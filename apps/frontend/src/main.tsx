import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App'
import './index.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { EntityProvider } from "@/context/EntityContext"
import { AuthProvider } from "@/context/AuthContext"
import { BranchProvider } from "@/context/BranchContext"
import { RefreshProvider } from "@/context/RefreshContext"
import { ExchangeRateProvider } from "@/context/ExchangeRateContext"
import { CashRegisterProvider } from "@/context/CashRegisterContext"
import { SystemConfigProvider } from "@/context/SystemConfigContext"
import { ArcaProvider } from "@/context/ArcaContext"
import EnterSubmitProvider from "@/components/enter-submit-provider"
import { CartProvider } from "@/context/CartContext"
import { NewPurchaseOrderProvider } from "@/contexts/new-purchase-order-context"
import { ErrorBoundary } from "@/components/ErrorBoundary"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <BranchProvider>
            <ArcaProvider>
              <EntityProvider>
                <RefreshProvider>
                  <ExchangeRateProvider>
                    <CashRegisterProvider>
                      <SystemConfigProvider>
                        <CartProvider>
                          <NewPurchaseOrderProvider>
                            <ErrorBoundary>
                              <App />
                            </ErrorBoundary>
                            <Toaster />
                            <EnterSubmitProvider />
                          </NewPurchaseOrderProvider>
                        </CartProvider>
                      </SystemConfigProvider>
                    </CashRegisterProvider>
                  </ExchangeRateProvider>
                </RefreshProvider>
              </EntityProvider>
            </ArcaProvider>
          </BranchProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)