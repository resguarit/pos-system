

import { useEntityContext } from "@/context/EntityContext";
import useApi from "./useApi";

/**
 * Hook personalizado para manejar entidades con caché
 * Permite cargar datos del contexto si ya existen o hacer una llamada al API si no
 */
export function useEntityWithCache() {
  const { request } = useApi();
  const { state, dispatch } = useEntityContext();

  /**
   * Carga una entidad del contexto o del API
   * @param entityType El tipo de entidad (customers, products, etc.)
   * @param id El ID de la entidad
   * @param endpoint El endpoint para cargar la entidad si no está en caché
   * @returns La entidad cargada o undefined si hay error
   */
  const getEntity = async <T>(
    entityType: keyof typeof state,
    id: string,
    endpoint: string
  ): Promise<T | undefined> => {
    // Comprobar si la entidad ya está en caché
    if (state[entityType] && state[entityType][id]) {
      return state[entityType][id] as T;
    }

    // Si no está en caché, cargar del API
    try {
      const response = await request({ method: "GET", url: endpoint });
      if (response && response.success && response.data) {
        // Guardar en el contexto para uso futuro
        dispatch({
          type: 'SET_ENTITY',
          entityType,
          id,
          entity: response.data
        });
        return response.data as T;
      }
    } catch (error) {
      console.error(`Error al cargar ${entityType}/${id}:`, error);
    }

    return undefined;
  };

  /**
   * Guarda una lista de entidades en el contexto
   * @param entityType El tipo de entidad (customers, products, etc.)
   * @param entities Lista de entidades para guardar
   */
  const setEntities = <T extends { id: number | string }>(
    entityType: keyof typeof state,
    entities: T[]
  ) => {
    dispatch({
      type: 'SET_ENTITIES',
      entityType,
      entities
    });
  };

  /**
   * Actualiza una entidad en el contexto
   * @param entityType El tipo de entidad (customers, products, etc.)
   * @param id El ID de la entidad
   * @param entity Los datos de la entidad
   */
  const updateEntity = <T>(
    entityType: keyof typeof state,
    id: string,
    entity: T
  ) => {
    dispatch({
      type: 'SET_ENTITY',
      entityType,
      id,
      entity
    });
  };

  return {
    getEntity,
    setEntities,
    updateEntity,
    cachedEntities: state
  };
}

export default useEntityWithCache;
