import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
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
import EnterSubmitProvider from "@/components/enter-submit-provider"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <BranchProvider>
            <EntityProvider>
              <RefreshProvider>
                <ExchangeRateProvider>
                  <CashRegisterProvider>
                    <SystemConfigProvider>
                      <App />
                      <Toaster />
                      <EnterSubmitProvider />
                    </SystemConfigProvider>
                  </CashRegisterProvider>
                </ExchangeRateProvider>
              </RefreshProvider>
            </EntityProvider>
          </BranchProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)