import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { ResizableTableHeader, ResizableTableCell } from "@/components/ui/resizable-table-header"
import { useResizableColumns } from "@/hooks/useResizableColumns"

interface ProductStat {
    product_id: number
    product_name: string
    total_quantity: number
    total_revenue: number
}

interface TopProductsTableProps {
    data: ProductStat[]
}

export function TopProductsTable({ data }: TopProductsTableProps) {
    const columns = [
        { id: 'product_name', defaultWidth: 300, minWidth: 150 },
        { id: 'total_quantity', defaultWidth: 150, minWidth: 100 },
        { id: 'total_revenue', defaultWidth: 150, minWidth: 100 }
    ]

    const { getColumnHeaderProps, getColumnCellProps, getResizeHandleProps } = useResizableColumns({
        columns,
        storageKey: 'top-products-table-widths'
    })

    return (
        <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <ResizableTableHeader
                                columnId="product_name"
                                getResizeHandleProps={getResizeHandleProps}
                                getColumnHeaderProps={getColumnHeaderProps}
                            >
                                Producto
                            </ResizableTableHeader>
                            <ResizableTableHeader
                                columnId="total_quantity"
                                getResizeHandleProps={getResizeHandleProps}
                                getColumnHeaderProps={getColumnHeaderProps}
                                className="text-right"
                            >
                                Cantidad
                            </ResizableTableHeader>
                            <ResizableTableHeader
                                columnId="total_revenue"
                                getResizeHandleProps={getResizeHandleProps}
                                getColumnHeaderProps={getColumnHeaderProps}
                                className="text-right"
                            >
                                Ingresos
                            </ResizableTableHeader>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((product) => (
                            <TableRow key={product.product_id}>
                                <ResizableTableCell
                                    columnId="product_name"
                                    getColumnCellProps={getColumnCellProps}
                                    className="font-medium truncate"
                                >
                                    {product.product_name}
                                </ResizableTableCell>
                                <ResizableTableCell
                                    columnId="total_quantity"
                                    getColumnCellProps={getColumnCellProps}
                                    className="text-right"
                                >
                                    {Number(product.total_quantity)}
                                </ResizableTableCell>
                                <ResizableTableCell
                                    columnId="total_revenue"
                                    getColumnCellProps={getColumnCellProps}
                                    className="text-right"
                                >
                                    ${Number(product.total_revenue).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </ResizableTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
