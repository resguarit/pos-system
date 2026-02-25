/**
 * Toast utility wrapper around sileo.
 * 
 * Centralizes all toast notifications so the underlying library
 * can be swapped without touching every file.
 * 
 * Usage:
 *   import { toast } from "@/lib/toast"
 *   toast.success("Guardado correctamente")
 *   toast.error("Error", "No se pudo guardar")
 *   toast.promise(myPromise, { loading: "Guardando...", success: "Listo", error: "Error" })
 */
import { sileo } from "sileo"
import type { SileoOptions } from "sileo"

// Re-export Toaster for use in main.tsx
export { Toaster } from "sileo"

type ToastOptions = Omit<SileoOptions, "title">

function success(title: string, description?: string, options?: ToastOptions) {
    return sileo.success({ title, description, ...options })
}

function error(title: string, description?: string, options?: ToastOptions) {
    return sileo.error({ title, description, ...options })
}

function info(title: string, description?: string, options?: ToastOptions) {
    return sileo.info({ title, description, ...options })
}

function warning(title: string, description?: string, options?: ToastOptions) {
    return sileo.warning({ title, description, ...options })
}

interface PromiseMessages {
    loading: string
    success: string | ((data: unknown) => string)
    error: string | ((err: unknown) => string)
}

function promise<T>(p: Promise<T>, messages: PromiseMessages) {
    return sileo.promise(p, {
        loading: { title: messages.loading },
        success: typeof messages.success === "function"
            ? (data: T) => ({ title: messages.success(data) as string })
            : { title: messages.success },
        error: typeof messages.error === "function"
            ? (err: unknown) => ({ title: messages.error(err) as string })
            : { title: messages.error },
    })
}

function dismiss(id?: string) {
    if (id) {
        sileo.dismiss(id)
    } else {
        sileo.clear()
    }
}

export const toast = {
    success,
    error,
    info,
    warning,
    promise,
    dismiss,
    /** Direct access to sileo for advanced use cases */
    raw: sileo,
}
