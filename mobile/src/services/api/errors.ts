import axios from 'axios';

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Network error. Please check your connection.';
    }
    const data = err.response.data;
    if (data && typeof data === 'object') {
      const maybe = data as { message?: unknown };
      if (typeof maybe.message === 'string') return maybe.message;
      if (Array.isArray(maybe.message) && maybe.message.length > 0) {
        return maybe.message.map(String).join('\n');
      }
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
