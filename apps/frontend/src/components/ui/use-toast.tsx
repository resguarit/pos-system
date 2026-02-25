import { sileo } from "sileo"

export const toast = sileo

export function useToast() {
  return {
    toast: sileo,
  }
}
