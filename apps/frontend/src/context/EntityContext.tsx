import { createContext, useContext, useReducer, type ReactNode } from "react";

// Definir tipos
export interface EntityState {
  customers: Record<string, any>;
  products: Record<string, any>;
  users: Record<string, any>;
  branches: Record<string, any>;
  suppliers: Record<string, any>;
  sales: Record<string, any>;
  categories: Record<string, any>;
  roles: Record<string, any>; 
}

type Action =
  | { type: 'SET_ENTITIES'; entityType: keyof EntityState; entities: any[] }
  | { type: 'SET_ENTITY'; entityType: keyof EntityState; id: string; entity: any }
  | { type: 'REMOVE_ENTITY'; entityType: keyof EntityState; id: string }
  | { type: 'CLEAR_ENTITIES'; entityType: keyof EntityState };

// Estado inicial
const initialState: EntityState = {
  customers: {},
  products: {},
  users: {},
  branches: {},
  suppliers: {},
  sales: {},
  categories: {}, 
  roles: {}, 
};

// Crear contexto
const EntityContext = createContext<{
  state: EntityState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

// Reducer para manejar acciones
function entityReducer(state: EntityState, action: Action): EntityState {
  switch (action.type) {
    case 'SET_ENTITIES':
      const entitiesMap = action.entities.reduce((acc, entity) => {
        acc[entity.id] = entity;
        return acc;
      }, {} as Record<string, any>);
      
      return {
        ...state,
        [action.entityType]: entitiesMap,
      };
    
    case 'SET_ENTITY':
      return {
        ...state,
        [action.entityType]: {
          ...state[action.entityType],
          [action.id]: action.entity,
        },
      };
    
    case 'REMOVE_ENTITY':
      const updatedEntities = { ...state[action.entityType] };
      delete updatedEntities[action.id];
      
      return {
        ...state,
        [action.entityType]: updatedEntities,
      };
    
    case 'CLEAR_ENTITIES':
      return {
        ...state,
        [action.entityType]: {},
      };
    
    default:
      return state;
  }
}

// Proveedor del contexto
export function EntityProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(entityReducer, initialState);
  
  return (
    <EntityContext.Provider value={{ state, dispatch }}>
      {children}
    </EntityContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useEntityContext() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error("useEntityContext must be used within an EntityProvider");
  }
  return context;
}
