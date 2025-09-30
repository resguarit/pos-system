

import { useEntityContext } from "@/context/EntityContext";

/**
 * Hook para actualizar entidades en el contexto global
 */
export function useEntityUpdater() {
  const { dispatch } = useEntityContext();

  /**
   * Actualiza una entidad en el contexto global
   */
  const updateEntity = <T>(entityType: string, id: string, data: T) => {
    dispatch({
      type: 'SET_ENTITY',
      entityType: entityType as any,
      id,
      entity: data
    });
  };

  /**
   * Elimina una entidad del contexto global
   */
  const removeEntity = (entityType: string, id: string) => {
    dispatch({
      type: 'REMOVE_ENTITY',
      entityType: entityType as any,
      id
    });
  };

  /**
   * Actualiza múltiples entidades en el contexto global
   */
  const updateEntities = <T extends { id: string | number }>(entityType: string, entities: T[]) => {
    dispatch({
      type: 'SET_ENTITIES',
      entityType: entityType as any,
      entities
    });
  };

  /**
   * Limpia todas las entidades de un tipo en el contexto global
   */
  const clearEntities = (entityType: string) => {
    dispatch({
      type: 'CLEAR_ENTITIES',
      entityType: entityType as any
    });
  };

  return {
    updateEntity,
    removeEntity,
    updateEntities,
    clearEntities
  };
}

export default useEntityUpdater;
