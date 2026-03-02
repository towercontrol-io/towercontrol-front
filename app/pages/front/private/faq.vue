<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">
        <UPageCard
        :title="$t('tickets.privateFaqTitle')"
        :description="$t('tickets.privateFaqDescription')"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
        />
      <TicketsTicketFaq :faqs="componentCtx.tickets" :loading="componentCtx.ticketsLoading" :loadingError="componentCtx.ticketsLoadingError"/>
    </div>
</template>

<script lang="ts" setup>
  import type { PrivTicketFaqResponseItf } from '~/types';

  definePageMeta({layout: 'main-layout', layoutProps: { title: 'ticketsFaq' }});
  const nuxtApp = useNuxtApp();
  const { t } = useI18n();

  const componentCtx = reactive({
    ticketsLoading: false as boolean,
    ticketsLoadingError: null as string | null,
    tickets: [] as PrivTicketFaqResponseItf[],
  });

  const loadTickets = async () => {
        componentCtx.ticketsLoading = true;
        componentCtx.ticketsLoadingError = null;
        nuxtApp.$apiBackendTickets.ticketsModuleFAQPrivateList(0,100).then((res) => {
            if (res.success) {
                componentCtx.tickets = res.success;
            } else if (res.error) {
                componentCtx.ticketsLoadingError = t('tickets.'+res.error.message);
            }
        }).catch((error) => {
            componentCtx.ticketsLoadingError = t('common.unknownError');
        }).finally(() => {
            componentCtx.ticketsLoading = false;
        });
    };
    onMounted(() => {
        loadTickets();
    })
</script>

