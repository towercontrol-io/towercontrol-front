<script lang="ts" setup>
    import type { PrivTicketAbstractResponseItf } from '~/types';
    import type { TableRow } from '@nuxt/ui';

    const props = defineProps<{
        tickets: PrivTicketAbstractResponseItf[];
        loading: boolean;
        loadingError: string | null;
    }>();

    const { t } = useI18n();
    const { $formatDuration } = useNuxtApp();
    const nuxtApp = useNuxtApp();

    const statusLabel = (status: string) => {
        if (status === 'OPEN') {
            return t('tickets.statusOpen');
        }
        if (status === 'CLOSED') {
            return t('tickets.statusClosed');
        }
        return t('tickets.statusUnknown');
    };

    const table = useTemplateRef('table');
    const columnFilters = ref([{
        id: 'topic',
        value: ''
    }]);
    const context = reactive({
        expanded: {} as Record<string, boolean>,
    });


    const onRowSelect = (e: Event, row: TableRow<PrivTicketAbstractResponseItf>) => {
        const isExpanded = row.getIsExpanded();
        context.expanded = isExpanded ? {} : { [row.id]: true };
    };

    const columnVisibility = ref({
        userPending: false
    });

    // --------------------------------------------------------------------
    // Handle the component signals
    // --------------------------------------------------------------------

    // Close the expended row when ticket list is refreshed
    nuxtApp.hook("ticketlst:refresh" as any, async () => {
        context.expanded = {} as Record<string, boolean>;
    });

</script>

<template>
    <div class="relative">
        <div class="flex flex-col flex-1 w-full">
            <div class="flex pb-2 border-b border-accented">
            <UInput
                :model-value="table?.tableApi?.getColumn('topic')?.getFilterValue() as string"
                class="max-w-sm"
                :placeholder="t('tickets.filterTopics')"
                @update:model-value="table?.tableApi?.getColumn('topic')?.setFilterValue($event)"
            />
            </div>
            <UTable
                ref="table"
                v-model:column-filters="columnFilters"
                v-model:expanded="context.expanded"
                v-model:column-visibility="columnVisibility"
                :loading="props.loading"
                loading-color="primary"
                loading-animation="carousel"
                :data="props.tickets"
                :onSelect="onRowSelect"
                :empty="$t('tickets.noResults')"
                sticky
                cellpadding=20
                class="flex-1 text-xs min-h-55"
            >
                <template #id-header>
                    <span class="font-bold">{{ t('tickets.ticketIdCol') }}</span>
                </template>
                <template #id-cell="{ row }">
                    <span>#{{ row.original.id }}</span>
                </template>

                <template #topic-header>
                    <span class="font-bold">{{ t('tickets.ticketTopicCol') }}</span>
                </template>
                <template #topic-cell="{ row }">
                    <MDC :value="row.original.topic" class="[&_*]:!my-0"/>
                </template>

                <template #creationMs-header>
                    <span class="font-bold">{{ t('tickets.ticketCreationCol') }}</span>
                </template>
                <template #creationMs-cell="{ row }">
                    <span>{{ $formatDuration((Date.now() - row.original.creationMs) / 1000) }}</span>
                </template>

                <template #status-header>
                    <span class="font-bold">{{ t('tickets.ticketStatusCol') }}</span>
                </template>
                <template #status-cell="{ row }">
                    <UChip v-if="row.original.userPending" color="error">
                       <UBadge :label="statusLabel(row.original.status)" variant="subtle" :color="(row.original.status=='OPEN')?'neutral':'success'" />
                    </UChip>
                    <UBadge v-else :label="statusLabel(row.original.status)" variant="subtle" :color="(row.original.status=='OPEN')?'neutral':'success'" />
                </template>
               
                <template #expanded="{ row }">
                    <TicketsTicketContent :ticketId="row.original.id" :key="row.original.id" :ticket="row.original"/>
                </template>
            </UTable>
        </div>

        <div v-if="props.loadingError" class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
            <div class="flex flex-col items-center gap-4">
                <div class="mb-2 text-lg text-center text-red-600 font-bold">
                    {{ props.loadingError }}
                </div>
            </div>
        </div>
    </div>
</template>
