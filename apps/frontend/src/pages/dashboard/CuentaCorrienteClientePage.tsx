import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CurrentAccountDetails } from "@/components/currentAccount/CurrentAccountDetails";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import useApi from "@/hooks/useApi";
import { sileo } from "sileo"
export default function CuentaCorrienteClientePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { request } = useApi();
  const [accountId, setAccountId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchAccountByCustomerId(params.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchAccountByCustomerId = async (customerId: string) => {
    try {
      setInitialLoading(true);
      // Buscar la cuenta corriente asociada al cliente
      const response = await request({
        method: "GET",
        url: `/current-accounts`,
        params: {
          customer_id: customerId,
          per_page: 1
        }
      });

      const accounts = response.data?.data || response.data || [];

      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      } else {
        sileo.error({ title: "El cliente no tiene cuenta corriente activa" });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error fetching account:', error);
      sileo.error({ title: error?.message || "Error al buscar la cuenta corriente" });
    } finally {
      setInitialLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground text-lg">No se encontró una cuenta corriente para este cliente.</p>
        <Button onClick={() => navigate('/dashboard/clientes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <CurrentAccountDetails
        accountId={accountId}
        onBack={() => navigate('/dashboard/clientes')}
      />
    </div>
  );
}
