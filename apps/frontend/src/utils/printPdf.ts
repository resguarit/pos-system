import { type SaleHeader } from '@/types/sale';
import { type ApiParams } from '@/hooks/useApi';

/**
 * Imprime un PDF de venta directamente en el navegador
 * En lugar de descargar, abre el diálogo de impresión del navegador
 */
export async function printSalePdf(
  sale: SaleHeader,
  requestFn: (params: ApiParams) => Promise<any>
): Promise<void> {
  if (!sale || !sale.id) {
    alert('No se puede imprimir el PDF: ID de venta faltante.');
    return;
  }

  try {
    const response = await requestFn({
      method: 'GET',
      url: `/pos/sales/${sale.id}/pdf`,
      responseType: 'blob',
    });

    if (!response || !(response instanceof Blob)) {
      throw new Error('La respuesta del servidor no es un archivo PDF válido.');
    }

    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    // Crear un iframe oculto para imprimir
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    // Cargar el PDF en el iframe
    iframe.src = url;

    // Esperar a que se cargue y abrir el diálogo de impresión
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Error al intentar imprimir:', e);
        alert('Error al abrir el diálogo de impresión. Intente con otro navegador.');
      }
      
      // Limpiar después de un breve delay para dar tiempo a la impresión
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    };

    iframe.onerror = () => {
      console.error('Error al cargar el PDF en el iframe');
      alert('Error al cargar el PDF para impresión.');
      document.body.removeChild(iframe);
      window.URL.revokeObjectURL(url);
    };
  } catch (error) {
    console.error('Error al obtener PDF para impresión:', error);
    alert('Error al obtener el PDF para impresión');
  }
}
