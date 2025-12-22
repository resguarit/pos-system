
const CART_STORAGE_KEY = 'pos_cart'

/**
 * Borra el carrito del almacenamiento local.
 * Abstrae la implementación de persistencia para desacoplarla de la UI.
 */
export const clearCartStorage = () => {
    try {
        localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
        console.error('Error al limpiar el carrito del almacenamiento:', error)
    }
}
