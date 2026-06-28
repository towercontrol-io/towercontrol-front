import type {
    AlertTemplateItf,
    AlertTemplateBodyItf,
    AlertTemplateListResponseItf,
    AlertHistoryResponseItf,
} from '~/types';
import type { ActionResult, ACTION_RESULT } from '~/types';

export default defineNuxtPlugin(() => {

  const GET_TIMEOUT = 5000; // 5 seconds

  // Routes
  const alertsTemplatePost: string   = '/alerts/1.0/template';
  const alertsTemplateDelete: string = '/alerts/1.0/template/{shortId}';
  const alertsTemplateList: string   = '/alerts/1.0/template';
  const alertsHistoryList: string    = '/alerts/1.0/history';

  const config = useRuntimeConfig();
  const appStore = applicationStore();

  function apiSessionHeaders(): any {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appStore.getBackendJWT()}`
    };
  }

  async function apiCallwithTimeout<T>(_method: any, url: string, body: any): Promise<T> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT);

      const response = await $fetch<T>(
        config.public.BACKEND_API_BASE + url,
        {
          method: _method,
          body: body,
          signal: controller.signal,
          headers: apiSessionHeaders()
        }
      );
      clearTimeout(timeout);

      if (!response) {
        appStore.setBackendDown();
        throw new Error('Erreur on backend API');
      } else {
        appStore.setBackendUp();
        return response;
      }
    } catch (error: any) {
      if (error.cause?.name === 'AbortError') {
        appStore.setBackendDown();
        error = {
          status: 'UNKNOWN' as ACTION_RESULT,
          status_code: 0,
          message: 'backendTimeout'
        } as ActionResult;
      } else if (error?.response?._data) {
        const actionResult = error.response._data as ActionResult;
        if (actionResult.status == undefined) {
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
        error = {
          status: 'UNKNOWN' as ACTION_RESULT,
          status_code: 0,
          message: 'unknownError'
        } as ActionResult;
      }
      throw error;
    }
  }

  const apiBackendAlerts = {

    /**
     * Create a new alert template (POST without shortId) or update an existing one (POST with shortId).
     * Returns 201 on creation, 200 on update.
     */
    alertTemplateSave: async (
      body: AlertTemplateBodyItf
    ): Promise<{ success?: AlertTemplateItf; error?: ActionResult | { message: string } }> => {
      try {
        const response = await apiCallwithTimeout<AlertTemplateItf>(
          'POST',
          alertsTemplatePost,
          body
        );
        return { success: response };
      } catch (error: any) {
        return { error };
      }
    },

    /**
     * Delete an alert template by shortId.
     * Requires ROLE_ALERTS_ADMIN (any template) or ROLE_ALERTS_TEMPLATE (own templates only).
     */
    alertTemplateDelete: async (
      shortId: string
    ): Promise<{ success?: boolean; error?: ActionResult | { message: string } }> => {
      try {
        await apiCallwithTimeout<void>(
          'DELETE',
          alertsTemplateDelete.replace('{shortId}', shortId),
          null
        );
        return { success: true };
      } catch (error: any) {
        return { error };
      }
    },

    /**
     * List alert templates accessible to the current user (own + global).
     * Returns an empty list when the backend responds with 204.
     */
    alertTemplateList: async (params?: {
      search?: string;
    }): Promise<{ success?: AlertTemplateListResponseItf; error?: ActionResult | { message: string } }> => {
      try {
        const query = new URLSearchParams();
        if (params?.search?.trim()) query.set('search', params.search.trim());
        const qs  = query.toString();
        const url = qs ? `${alertsTemplateList}?${qs}` : alertsTemplateList;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT);

        const raw = await $fetch.raw<AlertTemplateListResponseItf>(
          config.public.BACKEND_API_BASE + url,
          {
            method: 'GET',
            signal: controller.signal,
            headers: apiSessionHeaders()
          }
        );
        clearTimeout(timeout);
        appStore.setBackendUp();

        // 204 No Content → no templates found
        if (raw.status === 204 || raw._data == null) {
          return { success: { templates: [], total: 0 } };
        }
        return { success: raw._data };
      } catch (error: any) {
        if (error.cause?.name === 'AbortError') {
          appStore.setBackendDown();
          return {
            error: {
              status: 'UNKNOWN' as ACTION_RESULT,
              status_code: 0,
              message: 'backendTimeout'
            } as ActionResult
          };
        }
        if (error?.response?._data) {
          const actionResult = error.response._data as ActionResult;
          if (actionResult.status == undefined) {
            appStore.setBackendDown();
            return {
              error: {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'unknownError'
              } as ActionResult
            };
          }
          return { error: actionResult };
        }
        return {
          error: {
            status: 'UNKNOWN' as ACTION_RESULT,
            status_code: 0,
            message: 'unknownError'
          } as ActionResult
        };
      }
    },

    /**
     * Paginated alert history. Scope (own vs all) resolved server-side from JWT role.
     */
    alertHistoryList: async (params: {
      page: number;
      size: number;
      templateIds?: string[];
    }): Promise<{ success?: AlertHistoryResponseItf; error?: ActionResult | { message: string } }> => {
      try {
        const query = new URLSearchParams();
        query.set('page', String(params.page));
        query.set('size', String(params.size));
        (params.templateIds ?? []).forEach(id => query.append('templateId', id));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT);

        const raw = await $fetch.raw<AlertHistoryResponseItf>(
          config.public.BACKEND_API_BASE + alertsHistoryList + '?' + query.toString(),
          { method: 'GET', signal: controller.signal, headers: apiSessionHeaders() }
        );
        clearTimeout(timeout);
        appStore.setBackendUp();

        return { success: raw._data ?? { total: 0, page: 0, size: params.size, alerts: [] } };
      } catch (error: any) {
        if (error.cause?.name === 'AbortError') {
          appStore.setBackendDown();
          return { error: { status: 'UNKNOWN' as ACTION_RESULT, status_code: 0, message: 'backendTimeout' } as ActionResult };
        }
        if (error?.response?._data) {
          const actionResult = error.response._data as ActionResult;
          return actionResult.status != null
            ? { error: actionResult }
            : { error: { status: 'UNKNOWN' as ACTION_RESULT, status_code: 0, message: 'unknownError' } as ActionResult };
        }
        return { error: { status: 'UNKNOWN' as ACTION_RESULT, status_code: 0, message: 'unknownError' } as ActionResult };
      }
    },

  };

  return {
    provide: {
      apiBackendAlerts
    }
  };
});
