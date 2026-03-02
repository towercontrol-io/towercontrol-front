<template>
    <UPageCard
      :title="$t('tickets.publicFaqTitle')"
      :description="$t('tickets.publicFaqDescription')"
      variant="subtle"
    >
      <TicketsTicketFaq :faqs="componentCtx.tickets" :loading="componentCtx.ticketsLoading" :loadingError="componentCtx.ticketsLoadingError"/>
    </UPageCard>
</template>

<script lang="ts" setup>
  import type { PrivTicketFaqResponseItf } from '~/types';

  definePageMeta({layout: 'centered-form'});
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
        nuxtApp.$apiBackendTickets.ticketsModuleFAQPublicList(0,100).then((res) => {
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

