import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { apiUrl } from "@/lib/api/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IvaFormProps {
  iva?: Iva;
  onSuccess?: () => void;
}

interface Iva {
  id?: string;
  rate: number;
}

export function IvaForm({ iva, onSuccess }: IvaFormProps) {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Iva>({
    defaultValues: iva || {
      rate: 0,
    },
  });

  const onSubmit = async (data: Iva) => {
    setLoading(true);
    try {
      if (iva?.id) {
        await axios.put(`${apiUrl}/ivas/${iva.id}`, data);        toast.success("IVA rate updated successfully!");
      } else {
        await axios.post(`${apiUrl}/ivas`, data);        toast.success("IVA rate created successfully!");
        reset();
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save IVA rate:", error);      toast.error("Failed to save IVA rate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rate">IVA Rate (%) *</Label>
        <Input 
          id="rate" 
          type="number"
          step="0.01"
          {...register("rate", { 
            required: "IVA rate is required",
            valueAsNumber: true,
            min: { value: 0, message: "Rate must be 0% or higher" },
            max: { value: 100, message: "Rate must be 100% or lower" }
          })}
          placeholder="Enter IVA rate (e.g. 21)" 
        />
        {errors.rate && (
          <p className="text-sm text-red-500">{errors.rate.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          iva?.id ? "Update IVA Rate" : "Create IVA Rate"
        )}
      </Button>
    </form>
  );
}