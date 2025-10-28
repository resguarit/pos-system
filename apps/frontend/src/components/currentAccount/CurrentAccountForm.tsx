import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Customer } from '@/types/customer';
import { CurrentAccountService } from '@/lib/services/currentAccountService';
import { CreateCurrentAccountData, UpdateCurrentAccountData } from '@/types/currentAccount';

interface CurrentAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: any; // CurrentAccount | null
  onSuccess: () => void;
}

export function CurrentAccountForm({ open, onOpenChange, account, onSuccess }: CurrentAccountFormProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    credit_limit: '',
    notes: ''
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (open) {
      loadCustomers();
      if (account) {
        setFormData({
          customer_id: account.customer_id?.toString() || '',
          credit_limit: account.credit_limit?.toString() || '',
          notes: account.notes || ''
        });
      } else {
        setFormData({
          customer_id: '',
          credit_limit: '',
          notes: ''
        });
      }
    }
  }, [open, account]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      // Aquí deberías cargar los clientes desde tu servicio de clientes
      // const response = await CustomerService.getAll();
      // setCustomers(response.data);
      
      // Por ahora, datos de ejemplo
      setCustomers([
        { id: 1, person: { first_name: 'Juan', last_name: 'Pérez' }, email: 'juan@example.com' },
        { id: 2, person: { first_name: 'María', last_name: 'González' }, email: 'maria@example.com' },
      ]);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Selecciona un cliente');
      return;
    }

    try {
      setLoading(true);
      
      const data = {
        customer_id: parseInt(formData.customer_id),
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        notes: formData.notes || undefined
      };

      if (account) {
        await CurrentAccountService.update(account.id, data as UpdateCurrentAccountData);
        toast.success('Cuenta corriente actualizada exitosamente');
      } else {
        await CurrentAccountService.create(data as CreateCurrentAccountData);
        toast.success('Cuenta corriente creada exitosamente');
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.response?.data?.message || 'Error al guardar la cuenta corriente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Cuenta Corriente' : 'Nueva Cuenta Corriente'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Cliente *</Label>
            <Select 
              value={formData.customer_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
              disabled={loadingCustomers}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.person.first_name} {customer.person.last_name} - {customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_limit">Límite de Crédito</Label>
            <Input
              id="credit_limit"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.credit_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">
              Deja vacío para límite infinito
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre la cuenta..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (account ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

