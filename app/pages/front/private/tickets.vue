<script setup lang="ts">
    import { ref, computed, reactive, watch, watchEffect } from 'vue';
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { PrivTicketAbstractResponseItf } from '~/types';
    import type { TableRow } from '@nuxt/ui';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'ticketsUser' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();
    const toast = useToast();
    const { $formatDuration } = useNuxtApp();

    const componentCtx = reactive({
        creationMode: false,
        ticketsLoading: false as boolean,
        ticketsLoadingError: null as string | null,
        closedAsWell: false as boolean,
        tickets: [] as PrivTicketAbstractResponseItf[],

    });

    // --------------------------------------------------------------------
    // Get Ticket list
    // --------------------------------------------------------------------
    
    const loadTickets = async () => {
        componentCtx.ticketsLoading = true;
        componentCtx.ticketsLoadingError = null;
        nuxtApp.$apiBackendTickets.ticketsModulePrivateList(componentCtx.closedAsWell).then((res) => {
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



    // --------------------------------------------------------------------
    // Handle the component signals
    // --------------------------------------------------------------------

    nuxtApp.hook("ticketmng:close" as any, async () => {
        componentCtx.creationMode = false;
        loadTickets();
    });

</script> 

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">
       <UPageCard
        :title="$t('tickets.userTitle')"
        :description="$t('tickets.userDescription')"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
       >
       <UButton
            form="settings"
            :label="$t('tickets.create')"
            :disabled="componentCtx.creationMode"
            icon="i-lucide-plus"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
            @click="componentCtx.creationMode = true"
        />
        </UPageCard>

    
        <div v-if="appStore.isSupportUser()" class="relative">
            <UCard 
                v-if="componentCtx.creationMode"
                class="w-full max-w-4xl mx-auto mb-4"
                variant="subtle"
            >
                <template #header>
                    <span class="font-bold">{{ t('tickets.newTicket') }}</span>
                </template>
                <template #default>
                    <div class="relative">
                        <TicketsTicketForm />
                    </div>
                </template>
            </UCard>


            <UCard 
                class="w-full max-w-4xl mx-auto"
                variant="subtle"
            >
                <template #header>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold">{{ t('tickets.existingTickets') }}</span>
                        <div class="flex items-center gap-2">
                            <span>{{ $t('tickets.showClosedTickets') }}</span>
                            <USwitch 
                                v-model="componentCtx.closedAsWell" 
                                @change="loadTickets()" />
                        </div>
                    </div>
                </template>
                <template #default>
                    <div class="relative">
                        <TicketsTicketList 
                            :tickets="componentCtx.tickets" 
                            :loading="componentCtx.ticketsLoading" 
                            :loading-error="componentCtx.ticketsLoadingError" />
                    </div>
                </template>
            </UCard>

        </div>

        <div v-else>
            <UCard
                variant="outline"
                class="bg-error/10"
            >
                <span class="font-bold text-neutral">
                   {{ $t('tickets.userNoAccessMessage') }}
                </span>
            </UCard>
        </div>
    </div>
</template> 