import client from './client';

// GET /employees is server-side paginated ({ data, total, page, limit }). Callers that just
// need "all employees" for a dropdown/lookup (rather than the paginated List/Kanban views)
// use this instead of hitting the raw endpoint and assuming an array response.
export async function fetchAllEmployees(extraParams = {}) {
  try {
    const { data } = await client.get('/employees', { params: { limit: 500, ...extraParams } });
    return data.data || [];
  } catch {
    return [];
  }
}
