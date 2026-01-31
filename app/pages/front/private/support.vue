<script setup lang="ts">
    import { ref, computed, reactive, watch, watchEffect } from 'vue';
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { PrivTicketAbstractResponseItf } from '~/types';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'ticketsUser' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();
    const toast = useToast();
    const { $formatDuration } = useNuxtApp();

    const componentCtx = reactive({
        faqMode: false,
        ticketsLoading: false as boolean,
        ticketsLoadingError: null as string | null,
        closedAsWell: false as boolean,
        tickets: [] as PrivTicketAbstractResponseItf[],

        currentPage : 0 as number,
        searchBox : '' as string,
        pageSize : 15 as number,
        pageRealSize : 15 as number,

    });

    // --------------------------------------------------------------------
    // Get Ticket list
    // --------------------------------------------------------------------
    
    const loadTickets = async () => {
        componentCtx.ticketsLoading = true;
        componentCtx.ticketsLoadingError = null;
        nuxtApp.$apiBackendTickets.ticketsModuleSupportList(componentCtx.closedAsWell, componentCtx.currentPage, componentCtx.pageSize, componentCtx.searchBox).then((res) => {
            if (res.success) {
                componentCtx.tickets = res.success;
                componentCtx.pageRealSize = res.success.length;
                nuxtApp.callHook("ticketlst:refresh" as any); 
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
    // Page Management
    // --------------------------------------------------------------------

    const onPageChange = () => {
        loadTickets();
    };

    const onInputChange = () => {
        if ( componentCtx.searchBox.length === 0 || componentCtx.searchBox.length >= 3 || componentCtx.searchBox.match(/^[0-9]+$/) ) {
            componentCtx.currentPage = 0;
            loadTickets();
        }
    };

    // --------------------------------------------------------------------
    // Handle the component signals
    // --------------------------------------------------------------------

    nuxtApp.hook("ticketmng:close" as any, async () => {
        componentCtx.faqMode = false;
        loadTickets();
    });

    nuxtApp.hook("ticketcontent:close" as any, async () => {
        loadTickets();
    });


</script> 

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">
       <UPageCard
        :title="$t('tickets.supportTitle')"
        :description="$t('tickets.supportDescription')"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
       >
       <UButton
            form="settings"
            :label="$t('tickets.faqCreate')"
            icon="i-lucide-plus"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
            @click="componentCtx.faqMode = true"
        />
       </UPageCard>
    
        <div v-if="appStore.isSupportUser()" class="relative">

            <UCard 
                v-if="componentCtx.faqMode"
                class="w-full max-w-4xl mx-auto mb-4"
                variant="subtle"
            >
                <template #header>
                    <span class="font-bold">{{ t('tickets.faqNew') }}</span>
                </template>
                <template #default>
                    <div class="relative">
                        <TicketsFaqForm />
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
                    <div class="flex pb-2 border-b border-accented">
                        <UInput
                            v-model="componentCtx.searchBox"
                            class="max-w-sm"
                            :placeholder="t('tickets.filterTopics')"
                            @update:modelValue="onInputChange()"
                        />
                        <UPagination
                            :show-controls="true"
                            :sibling-count="1"
                            show-edges
                            active-color="neutral"
                            :page="(componentCtx.currentPage)+1"
                            :items-per-page="componentCtx.pageRealSize"
                            :total="componentCtx.tickets[0]?.countItems || 0"
                            @update:page="(p) => { componentCtx.currentPage = p - 1; onPageChange(); }"
                            class="ml-auto"
                        />
                    </div>
                    <div class="relative">
                        <TicketsSupportList 
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