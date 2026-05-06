import type { 
   AuditSearchResponse
} from '~/types';
import type { ActionResult, ACTION_RESULT } from '~/types';
import { applicationStore } from '~/stores/app'

export default defineNuxtPlugin(() => {

  const GET_TIMEOUT = 5000; // 5 seconds

  // Set the routes
  const auditModuleSearchGet: string = '/audit/1.0/logs/search';
  
  // Get dynmaic configuration
  const config = useRuntimeConfig();
  const appStore = applicationStore();

  // Client configuration for public API requests
  const apiPublicHeaders =  {
      'Content-Type': 'application/json'
  };

  // Client configuration for session API requests
  function apiSessionHeaders() : any  {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appStore.getBackendJWT()}`
    }
  };

  /**
   * Generic Functon to call backend API with timeout and backend status management.
   * 
   * @param _method 
   * @param url 
   * @param body 
   * @param public 
   * @returns 
   */
  async function apiCallwithTimeout<T>(_method: any, url: string, body: any, isPublic: boolean): Promise<T> {
    try {
        // Gestion du timeout (5s)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT)

        const response = await $fetch<T>(
                config.public.BACKEND_API_BASE+url, 
                {
                    method: _method,
                    body: body,
                    signal: controller.signal,
                    headers: (isPublic) ? apiPublicHeaders : apiSessionHeaders()
                }
        );
        clearTimeout(timeout)

        // Check the restponse code 200 expected
        if (!response) {
            appStore.setBackendDown();
            throw new Error(`Erreur on backend API`)
        } else {
            appStore.setBackendUp();
            return response;
        }
    } catch (error: any) {
        // Test Timeout situation
        //console.log('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        if (error.cause?.name === 'AbortError') {
            appStore.setBackendDown();
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'backendTimeout' 
            } as ActionResult;
        }
        // Try to match an ActionResult error (if not the case report server error)
        else if (error?.response?._data) {
            const actionResult = error.response._data as ActionResult;
            if ( actionResult.status == undefined ) {
                appStore.setBackendDown();
                error = {
                    status: 'UNKNOWN' as ACTION_RESULT,
                    status_code: 0,
                    message: 'unknownError' 
                } as ActionResult;
            } else {
               error = actionResult;
            }
        } else {
            // probably cors error
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'unknownError' 
            } as ActionResult;
        }
        throw error
    }
  }

  const apiBackendAudit = {
  
    /**
     * List Audit logs with pagination and search
     */
    auditModuleListAndSearch: async (
        search : string, // search string, will be base64 encoded
        startMs : number, // start date in ms
        endMs : number, // end date in ms
        page : number, // what result page to show
        pageSize : number, // how many result per page
    ): Promise<{ success?: AuditSearchResponse; error?: ActionResult | { message: string } }> => {
        try {
            const qs = new URLSearchParams();
            if (search.length > 0) qs.set('search', btoa(search));
            if (startMs !== 0)     qs.set('startMs', String(startMs));
            if (endMs !== 0)       qs.set('endMs',   String(endMs));
            if (page !== 0)        qs.set('page',     String(page));
            if (pageSize !== 0)    qs.set('pageSize', String(pageSize));
            const params = qs.size > 0 ? `?${qs.toString()}` : '';
            const response = await apiCallwithTimeout<AuditSearchResponse>(
                'GET',
                auditModuleSearchGet+params,
                undefined,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

  };
  return {
    provide: {
      apiBackendAudit
    }
  }
})