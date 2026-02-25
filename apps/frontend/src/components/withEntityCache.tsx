

import { type ComponentType, useEffect, useState } from 'react'
import { useEntityContext, type EntityState } from '@/context/EntityContext'
import useApi from '@/hooks/useApi'
import { sileo } from "sileo"
/**
 * HOC que agrega capacidad de caché de entidades a cualquier componente de formulario
 * 
 * @param WrappedComponent El componente a envolver
 * @param entityType El tipo de entidad (customers, users, etc.)
 * @param idPropName Nombre de la propiedad que contiene el ID
 * @param dataPropName Nombre de la propiedad donde se pasarán los datos
 * @param endpoint Función que genera el endpoint para obtener la entidad
 */
export function withEntityCache<P extends object>(
  WrappedComponent: ComponentType<P>,
  entityType: string,
  idPropName: string = 'id',
  dataPropName: string = 'data',
  endpoint: (id: string) => string
) {
  return function WithEntityCache(props: any) {
    const { state, dispatch } = useEntityContext()
    const { request } = useApi()
    const [entityData, setEntityData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    
    const entityId = props[idPropName]
    
    useEffect(() => {
      const fetchEntityIfNeeded = async () => {
        // Si no hay ID, no hacemos nada
        if (!entityId) return;
        
        // Verificamos si ya tenemos la entidad en el contexto
        // @ts-ignore - Ignoramos porque sabemos que existirá la propiedad
        const cachedEntity = state[entityType]?.[entityId]
        
        if (cachedEntity) {
          // Si ya tenemos la entidad en caché, la usamos
          setEntityData(cachedEntity)
          return
        }
        
        // Si no está en caché, la cargamos del servidor
        setIsLoading(true)
        try {
          const response = await request({
            method: 'GET',
            url: endpoint(entityId)
          })
          
          const entity = response?.data || response
            if (entity) {
            // Guardamos en el contexto para uso futuro
            dispatch({
              type: 'SET_ENTITY',
              entityType: entityType as keyof EntityState,
              id: entityId,
              entity
            })
            
            setEntityData(entity)
          }
        } catch (error) {
          sileo.error({ title: 'Error',
            description: `No se pudo cargar la información del ${entityType}`
          })
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchEntityIfNeeded()
    }, [entityId, request, dispatch])
    
    // Pasamos los datos y el estado de carga al componente
    const enhancedProps = {
      ...props,
      [dataPropName]: entityData,
      isLoadingEntity: isLoading
    }
    
    return <WrappedComponent {...enhancedProps as P} />
  }
}

export default withEntityCache
