import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type PublicWriteRequest =
  | {
      action: 'complaint';
      submissionRpc: 'submit_public_complaint_v2';
      payload: Record<string, unknown>;
      clientSubmissionId: string;
      reporterContext: object;
    }
  | {
      action: 'response';
      reportId: string;
      responseType: 'citizen_information' | 'subject_response';
      payload: Record<string, unknown>;
      visitorId: string;
      sessionId: string;
    }
  | {
      action: 'session';
      payload: Record<string, unknown>;
    };

export interface PublicWriteFailure {
  code: string;
  message: string;
}

export interface PublicWriteResult<T> {
  data: T | null;
  error: PublicWriteFailure | null;
}

type PublicFunctionName = 'public-write-gateway' | 'public-evidence-upload';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function getInvokeFailure(error: unknown): Promise<PublicWriteFailure> {
  const errorObject = isRecord(error) ? error : {};
  let responseBody: Record<string, unknown> | null = null;
  const context = errorObject.context;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      if (isRecord(body)) responseBody = body;
    } catch {
      // Use the function client's message when the response is not JSON.
    }
  }

  const code =
    (typeof responseBody?.code === 'string' && responseBody.code) ||
    (typeof errorObject.code === 'string' && errorObject.code) ||
    'PUBLIC_FUNCTION_REQUEST_FAILED';
  const message =
    (typeof responseBody?.error === 'string' && responseBody.error) ||
    (typeof responseBody?.message === 'string' && responseBody.message) ||
    (typeof errorObject.message === 'string' && errorObject.message) ||
    'The request could not be completed.';

  return { code, message };
}

async function invokePublicFunction<T>(
  functionName: PublicFunctionName,
  body: Record<string, unknown> | FormData
): Promise<PublicWriteResult<T>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: null,
      error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase client is not configured.' },
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke<unknown>(functionName, { body });
    if (error) {
      return { data: null, error: await getInvokeFailure(error) };
    }

    if (!isRecord(data)) {
      return {
        data: null,
        error: { code: 'INVALID_FUNCTION_RESPONSE', message: 'The server returned an invalid response.' },
      };
    }

    if (data.success !== true) {
      return {
        data: null,
        error: {
          code: typeof data.code === 'string' ? data.code : 'PUBLIC_FUNCTION_REJECTED',
          message:
            (typeof data.error === 'string' && data.error) ||
            (typeof data.message === 'string' && data.message) ||
            'The request was rejected by the server.',
        },
      };
    }

    if (!Object.prototype.hasOwnProperty.call(data, 'result')) {
      return {
        data: null,
        error: { code: 'INVALID_FUNCTION_RESPONSE', message: 'The server response is missing its result.' },
      };
    }

    return { data: data.result as T, error: null };
  } catch (error) {
    return { data: null, error: await getInvokeFailure(error) };
  }
}

export function invokePublicWrite<T>(body: PublicWriteRequest): Promise<PublicWriteResult<T>> {
  return invokePublicFunction<T>('public-write-gateway', body);
}

export function uploadPublicEvidence(clientSubmissionId: string, file: File): Promise<PublicWriteResult<unknown>> {
  const body = new FormData();
  body.append('clientSubmissionId', clientSubmissionId);
  body.append('file', file, file.name);

  return invokePublicFunction<unknown>('public-evidence-upload', body);
}
