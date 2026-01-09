import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, AlertCircle, Smartphone } from 'lucide-react';

// Interfaz para la configuración de horarios
export interface AccessSchedule {
    enabled: boolean;
    timezone: string;
    days: number[];
    start_time: string;
    end_time: string;
}

interface ScheduleRestrictionConfigProps {
    value: AccessSchedule | null;
    onChange: (schedule: AccessSchedule | null) => void;
    singleSessionOnly?: boolean;
    onSingleSessionChange?: (value: boolean) => void;
    disabled?: boolean;
    isAdmin?: boolean;
}

// Configuración de días de la semana
const DAYS_OF_WEEK = [
    { id: 1, short: 'L', name: 'Lunes' },
    { id: 2, short: 'M', name: 'Martes' },
    { id: 3, short: 'M', name: 'Miércoles' },
    { id: 4, short: 'J', name: 'Jueves' },
    { id: 5, short: 'V', name: 'Viernes' },
    { id: 6, short: 'S', name: 'Sábado' },
    { id: 7, short: 'D', name: 'Domingo' },
];

// Valor por defecto para nueva configuración
const DEFAULT_SCHEDULE: AccessSchedule = {
    enabled: true,
    timezone: 'America/Argentina/Buenos_Aires',
    days: [1, 2, 3, 4, 5], // Lunes a Viernes
    start_time: '08:00',
    end_time: '18:00',
};

export default function ScheduleRestrictionConfig({
    value,
    onChange,
    singleSessionOnly = false,
    onSingleSessionChange,
    disabled = false,
    isAdmin = false,
}: ScheduleRestrictionConfigProps) {
    const [schedule, setSchedule] = useState<AccessSchedule>(
        value || { ...DEFAULT_SCHEDULE, enabled: false }
    );

    // Sincronizar con valor externo
    useEffect(() => {
        if (value) {
            setSchedule(value);
        }
    }, [value]);

    // Manejar cambio de habilitación
    const handleToggle = (enabled: boolean) => {
        const newSchedule = enabled
            ? { ...DEFAULT_SCHEDULE, enabled: true }
            : { ...schedule, enabled: false };
        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    // Manejar cambio de día
    const handleDayToggle = (dayId: number) => {
        const newDays = schedule.days.includes(dayId)
            ? schedule.days.filter((d) => d !== dayId)
            : [...schedule.days, dayId].sort((a, b) => a - b);
        const newSchedule = { ...schedule, days: newDays };
        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    // Manejar cambio de horario
    const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
        const newSchedule = { ...schedule, [field]: value };
        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    // Formatear días seleccionados para preview
    const formatSelectedDays = () => {
        if (schedule.days.length === 0) return 'Ningún día seleccionado';
        if (schedule.days.length === 7) return 'Todos los días';
        if (
            schedule.days.length === 5 &&
            [1, 2, 3, 4, 5].every((d) => schedule.days.includes(d))
        ) {
            return 'Lunes a Viernes';
        }
        if (
            schedule.days.length === 6 &&
            [1, 2, 3, 4, 5, 6].every((d) => schedule.days.includes(d))
        ) {
            return 'Lunes a Sábado';
        }
        return schedule.days.map((d) => DAYS_OF_WEEK.find((day) => day.id === d)?.name).join(', ');
    };

    // Si es Admin, mostrar mensaje informativo
    if (isAdmin) {
        return (
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">Restricción de Horario</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-blue-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                            El rol Administrador tiene acceso sin restricciones de horario.
                        </span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Restricción de Horario</CardTitle>
                    </div>
                    <Switch
                        checked={schedule.enabled}
                        onCheckedChange={handleToggle}
                        disabled={disabled}
                    />
                </div>
                <CardDescription>
                    Limita el acceso al sistema en ciertos horarios y días de la semana.
                </CardDescription>
            </CardHeader>

            {schedule.enabled && (
                <CardContent className="space-y-6">
                    {/* Selector de días */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Días permitidos
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = schedule.days.includes(day.id);
                                return (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => handleDayToggle(day.id)}
                                        disabled={disabled}
                                        title={day.name}
                                        className={`
                                            flex items-center justify-center
                                            w-11 h-11 rounded-lg font-semibold text-sm 
                                            transition-all duration-200 border-2
                                            ${isSelected
                                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:border-gray-300'
                                            }
                                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                                        `}
                                    >
                                        {day.short}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selector de horario */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Horario de acceso
                        </Label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Label htmlFor="start_time" className="text-xs text-muted-foreground mb-1 block">
                                    Desde
                                </Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={schedule.start_time}
                                    onChange={(e) => handleTimeChange('start_time', e.target.value)}
                                    disabled={disabled}
                                    className="text-center"
                                />
                            </div>
                            <span className="text-muted-foreground mt-5">—</span>
                            <div className="flex-1">
                                <Label htmlFor="end_time" className="text-xs text-muted-foreground mb-1 block">
                                    Hasta
                                </Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={schedule.end_time}
                                    onChange={(e) => handleTimeChange('end_time', e.target.value)}
                                    disabled={disabled}
                                    className="text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview de configuración */}
                    <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4 text-primary" />
                            {formatSelectedDays()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {schedule.start_time} - {schedule.end_time} hs
                        </div>
                    </div>

                    {schedule.days.length === 0 && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            Debe seleccionar al menos un día
                        </div>
                    )}
                </CardContent>
            )}

            {/* Sección de Sesión Única */}
            {onSingleSessionChange && (
                <>
                    <div className="border-t mx-6" />
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="space-y-1">
                                    <Label className="font-medium">Sesión única por dispositivo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Cierra sesiones anteriores al iniciar en un nuevo dispositivo
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={singleSessionOnly}
                                onCheckedChange={onSingleSessionChange}
                            />
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
}
