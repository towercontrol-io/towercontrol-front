import type { PrivTicketCreationBody, PrivTicketCreationResponseItf, PrivTicketAbstractResponseItf, PrivTicketUserDetailResponseItf } from '~/types';
import type { ActionResult, ACTION_RESULT } from '~/types';
import { applicationStore } from '~/stores/app'

export default defineNuxtPlugin(() => {

  const GET_TIMEOUT = 5000; // 5 seconds

  // Set the routes
  const ticketsModulePublicCreationPost: string = '/tickets/1.0/public/create';
  const ticketsModuleCreatePost: string = '/tickets/1.0/ticket';
  const ticketsModuleListGet: string = '/tickets/1.0/ticket';
  const ticketsModuleTicketGet: string = '/tickets/1.0/ticket';

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

  const apiBackendTickets = {
  
    /**
     * Create a new Tiket (public API)
     */
    ticketsModulePublicCreation: async (body:PrivTicketCreationBody): Promise<{ success?: PrivTicketCreationResponseItf; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<PrivTicketCreationResponseItf>(
                'POST',
                ticketsModulePublicCreationPost,
                body,
                true
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

    /**
     * Create a new Tiket (private API)
     */
    ticketsModulePrivateCreation: async (body:PrivTicketCreationBody): Promise<{ success?: PrivTicketCreationResponseItf; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<PrivTicketCreationResponseItf>(
                'POST',
                ticketsModuleCreatePost,
                body,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

    /**
     * List Owner tickets with closed tickets on request
     */
    ticketsModulePrivateList: async (closedAsWell:boolean): Promise<{ success?: PrivTicketAbstractResponseItf[]; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<PrivTicketAbstractResponseItf[]>(
                'GET',
                ticketsModuleListGet+(closedAsWell ? '?closed=true' : ''),
                undefined,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

    /**
     * Get details of one signe ticket with associated messages
     */
    ticketsModulePrivateOneTicket: async (ticketId:number): Promise<{ success?: PrivTicketUserDetailResponseItf; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<PrivTicketUserDetailResponseItf>(
                'GET',
                ticketsModuleTicketGet+'/'+ticketId+'/',
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
      apiBackendTickets
    }
  }
})