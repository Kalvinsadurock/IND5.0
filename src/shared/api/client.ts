import supabase from './supabase';

// Helper to handle Supabase/PostgREST responses consistently
const handleResponse = async (maybePromiseOrBuilder: any) => {
  try {
    // Supabase Postgrest builders return an object via .then; handle both
    const resp = typeof maybePromiseOrBuilder?.then === 'function'
      ? await maybePromiseOrBuilder
      : await Promise.resolve(maybePromiseOrBuilder);

    const { data, error } = resp || {};
    if (error) throw new Error(error?.message || String(error));
    return data;
  } catch (err: any) {
    // Normalize error
    throw new Error(err?.message || String(err));
  }
};

// Helper to make HTTP requests to API server
const apiCall = async (method: string, endpoint: string, body?: any) => {
  // In browser: use window location or hardcoded default
  // Vite injects VITE_API_URL at build time, but we'll use a sensible default
  let apiBase = 'http://localhost:8001';
  
  if (typeof window !== 'undefined') {
    // Try to get from globalThis (Vite injects here) or use default
    const globalEnv = (globalThis as any).__env || {};
    apiBase = globalEnv.VITE_API_URL || 'http://localhost:8001';
  }
  
  const url = `${apiBase}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  return response.json();
};

export const partsApi = {
  list: (params?: { search?: string; status?: string; priority?: string; processId?: number }) => {
    let query = supabase.from('parts').select('*, process_steps(*)');
    if (params?.status) query = query.eq('status', params.status);
    if (params?.priority) query = query.eq('priority', params.priority);
    if (params?.processId) query = query.eq('process_id', params.processId);
    if (params?.search) query = query.ilike('part_number', `%${params.search}%`);
    return handleResponse(query);
  },
  get: (id: number) => handleResponse(supabase.from('parts').select('*, process_steps(*)').eq('id', id).single()),
  getTimeline: (id: number) => handleResponse(supabase.from('timeline_events').select('*').eq('part_id', id).order('occurred_at', { ascending: false })),
  create: (data: any) => handleResponse(supabase.from('parts').insert([data])),
};

export const instancesApi = {
  startStep: (partId: number, stepId: number, data: any) => 
    handleResponse(supabase.from('part_step_instances').insert([{ part_id: partId, step_id: stepId, status: 'active', ...data }])),
  complete: (instanceId: number) => 
    handleResponse(supabase.from('part_step_instances').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', instanceId)),
  block: (instanceId: number, reason: string) => 
    handleResponse(supabase.from('part_step_instances').update({ status: 'blocked', blocked_reason: reason }).eq('id', instanceId)),
};

export const checkpointsApi = {
  getForStep: (stepId: number) => handleResponse(supabase.from('control_checkpoints').select('*').eq('step_id', stepId)),
  recordResult: (resultId: number, data: any) => 
    handleResponse(supabase.from('checkpoint_results').update(data).eq('id', resultId)),
};

export const mouldsApi = {
  list: () => handleResponse(supabase.from('moulds').select('*')),
  breakdown: (mouldId: number, reason: string) => 
    handleResponse(supabase.from('moulds').update({ status: 'breakdown', last_breakdown_at: new Date().toISOString() }).eq('id', mouldId)),
};

export const supplyApi = {
  list: (params?: { state?: string }) => {
    let query = supabase.from('supply_lots').select('*');
    if (params?.state) query = query.eq('state', params.state);
    return handleResponse(query);
  },
  checkForStep: (stepId: number) => handleResponse(supabase.from('supply_requirements').select('*').eq('step_id', stepId)),
};

export const processesApi = {
  list: () => handleResponse(supabase.from('processes').select('*')),
  getSteps: (processId: number) => handleResponse(supabase.from('process_steps').select('*').eq('process_id', processId).order('sequence')),
};

export const employeesApi = {
  list: () => handleResponse(supabase.from('employees').select('*').eq('is_active', true)),
  getUtilization: () => handleResponse(supabase.from('employee_status_history').select('*')),
};

export const operationsApi = {
  // Points to the view we created in the SQL earlier to show real bottlenecks
  getBottlenecks: () => handleResponse(supabase.from('production_bottlenecks').select('*')),
};

// Material Management API
export const materialsApi = {
  create: (data: { materialType: string; createdBy: string; photoUrl: string; targetProcessId: number }) =>
    apiCall('POST', '/api/materials/create', data),
  getAvailable: (processId: number, materialType?: string) =>
    apiCall('GET', `/api/materials/available?processId=${processId}${materialType ? `&materialType=${materialType}` : ''}`),
  getTraceability: (materialId: number) =>
    apiCall('GET', `/api/materials/${materialId}/traceability`),
  startProcessExecution: (data: { processId: number; startedBy: string; materialIds?: any[] }) =>
    apiCall('POST', '/api/process-execution/start', data),
};
