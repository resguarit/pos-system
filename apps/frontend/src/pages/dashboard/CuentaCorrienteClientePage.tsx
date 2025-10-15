import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import useApi from "@/hooks/useApi";
import { toast } from "sonner";

export default function CuentaCorrienteClientePage() {
  const params = useParams();
  const { request, loading } = useApi();
  const [customer, setCustomer] = useState<any>(null);
  const [accountData, setAccountData] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchCustomerAndAccount(params.id);
    }
  }, [params.id]);

  const fetchCustomerAndAccount = async (id: string) => {
    try {
      // Obtener datos del cliente
      const customerResponse = await request({
        method: "GET",
        url: `/customers/${id}`,
      });
      setCustomer(customerResponse.data?.data || customerResponse.data);

      // TODO: Obtener datos de cuenta corriente
      // const accountResponse = await request({
      //   method: "GET",
      //   url: `/customers/${id}/current-account`,
      // });
      // setAccountData(accountResponse.data?.data || accountResponse.data);
      
      // Por ahora, datos de ejemplo
      setAccountData({
        balance: 0,
        credit_limit: 50000,
        movements: []
      });
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar la cuenta corriente");
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  if (loading && !customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/clientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Cuenta Corriente</h1>
            {customer && (
              <p className="text-muted-foreground">
                {customer.person?.first_name} {customer.person?.last_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Cuenta */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountData?.balance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Límite de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountData?.credit_limit || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crédito Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (accountData?.credit_limit || 0) - (accountData?.balance || 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Funcionalidad de cuentas corrientes en desarrollo</p>
            <p className="text-sm mt-2">
              Aquí se mostrarán los movimientos de la cuenta corriente del cliente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
