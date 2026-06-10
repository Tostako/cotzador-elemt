import type { QuoteFormData } from '../types';

/**
 * Safely parses a quote's `data` into a QuoteFormData object.
 * Handles all cases:
 *   - Object (from SaaS JSONB): { client: "..." } → returns directly
 *   - Single-stringified: '{"client":"..."}' → parses once
 *   - Double-stringified: '"{\\"client\\":\\"...\\"}"' → parses twice
 */
export function safeParseQuoteData(data: unknown): QuoteFormData | null {
  try {
    let parsed: unknown = data;

    // If it's a string, parse it
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
      // Handle double-stringified case
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    }

    // Validate it's a valid QuoteFormData object
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'client' in parsed &&
      'project' in parsed
    ) {
      return parsed as QuoteFormData;
    }

    return null;
  } catch {
    return null;
  }
}
