import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { apiUrl } from "@/lib/api/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MeasureFormProps {
  measure?: Measure;
  onSuccess?: () => void;
}

interface Measure {
  id?: string;
  name: string;
}

export function MeasureForm({ measure, onSuccess }: MeasureFormProps) {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Measure>({
    defaultValues: measure || {
      name: "",
    },
  });

  const onSubmit = async (data: Measure) => {
    setLoading(true);
    try {
      if (measure?.id) {
        await axios.put(`${apiUrl}/measures/${measure.id}`, data);        toast.success("Unit of measure updated successfully!");
      } else {
        await axios.post(`${apiUrl}/measures`, data);        toast.success("Unit of measure created successfully!");
        reset();
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save unit of measure:", error);      toast.error("Failed to save unit of measure. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Unit of Measure Name*</Label>
        <Input 
          id="name" 
          {...register("name", { required: "Unit of measure name is required" })}
          placeholder="Enter unit of measure (e.g. Kg, Liter, Piece)" 
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          measure?.id ? "Update Unit of Measure" : "Create Unit of Measure"
        )}
      </Button>
    </form>
  );
}