
/**
 * Checks if a text matches a pattern that may contain wildcards (%).
 * 
 * @param text The text to search within (e.g., product description)
 * @param pattern The search pattern (e.g., "pro% 3kg")
 * @returns true if the text matches the pattern
 * 
 * Behavior:
 * - If pattern contains '%', it splits the pattern by '%' and ensures all segments
 *   appear in the text in the correct order.
 * - If pattern does not contain '%', it performs a simple case-insensitive inclusion check.
 * - Comparisons are always case-insensitive.
 */
/**
 * Creates a matcher function for a given wildcard pattern.
 * Optimized for filtering lists where the pattern is constant.
 */
export const createWildcardMatcher = (pattern: string) => {
    if (!pattern) return (_: string | null | undefined) => true;

    const normalizedPattern = pattern.toLowerCase();
    const hasWildcard = normalizedPattern.includes('%');

    // Pre-calculate segments if there is a wildcard
    const segments = hasWildcard
        ? normalizedPattern.split('%').filter(s => s.length > 0)
        : null;

    return (text: string | null | undefined): boolean => {
        if (!text) return false;
        const normalizedText = text.toLowerCase();

        // Simple match
        if (!hasWildcard || !segments) {
            return normalizedText.includes(normalizedPattern);
        }

        // Wildcard match
        if (segments.length === 0) return true; // pattern was just "%" or "%%"

        let currentIndex = 0;
        for (const segment of segments) {
            const foundIndex = normalizedText.indexOf(segment, currentIndex);
            if (foundIndex === -1) return false;
            currentIndex = foundIndex + segment.length;
        }

        return true;
    };
};

/**
 * Checks if a text matches a pattern that may contain wildcards (%).
 * Wrapper around createWildcardMatcher for one-off checks.
 */
export const matchesWildcard = (text: string | null | undefined, pattern: string): boolean => {
    return createWildcardMatcher(pattern)(text);
};
