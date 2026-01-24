<script lang="ts" setup>

    import type { PrivTicketUserDetailResponseItf } from '~/types';

    const props = defineProps<{
            ticketId: number;
    }>();

    const { t } = useI18n();
    const { $formatDuration } = useNuxtApp();

    const componentCtx = reactive({
        creationMode: false,
        ticketLoading: false as boolean,
        ticketLoadingError: null as string | null,
        ticket: {} as PrivTicketUserDetailResponseItf,
    });

    // --------------------------------------------------------------------
    // Get Ticket Details
    // --------------------------------------------------------------------
    
    const loadTicket = async () => {
        componentCtx.ticketLoading = true;
        componentCtx.ticketLoadingError = null;
        useNuxtApp().$apiBackendTickets.ticketsModulePrivateOneTicket(props.ticketId).then((res) => {
            if (res.success) {
                componentCtx.ticket = res.success;
            } else if (res.error) {
                componentCtx.ticketLoadingError = t('tickets.'+res.error.message);
            }
        }).catch((error) => {
            componentCtx.ticketLoadingError = t('common.unknownError');
        }).finally(() => {
            componentCtx.ticketLoading = false;
        });
    };


    onMounted(() => {
        loadTicket();
    });

</script>


<template>
  <div>
    hello world {{ ticketId }}
    <MDC v-if="componentCtx.ticket.content" :value="componentCtx.ticket.content" class="[&_*]:!my-0"/>
</div>
</template>


<style>

</style>