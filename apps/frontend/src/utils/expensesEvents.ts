/**
 * Custom events for the expenses module to synchronize components.
 */

export const EXPENSES_CHANGED_EVENT = 'expenses:changed';

/**
 * Dispatches an event indicating that expenses have been modified
 * (created, updated, deleted, or paid).
 */
export const dispatchExpensesChanged = () => {
    window.dispatchEvent(new CustomEvent(EXPENSES_CHANGED_EVENT));
};
