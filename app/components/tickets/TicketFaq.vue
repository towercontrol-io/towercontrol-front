<script lang="ts" setup>
    import type { PrivTicketFaqResponseItf } from '~/types';
    import type { TableRow } from '@nuxt/ui';
import { id } from '@nuxt/ui/runtime/locale/index.js';

    const props = defineProps<{
        faqs: PrivTicketFaqResponseItf[];
        loading: boolean;
        loadingError: string | null;
    }>();

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();



    const table = useTemplateRef('table');
    const columnFilters = ref([{
        id: 'topic',
        value: ''
    }]);
    const context = reactive({
        expanded: {} as Record<string, boolean>,
    });


    const onRowSelect = (e: Event, row: TableRow<PrivTicketFaqResponseItf>) => {
        const isExpanded = row.getIsExpanded();
        context.expanded = isExpanded ? {} : { [row.id]: true };
    };

    const columnVisibility = ref({
        content: false,
        totalFaq: false,
        id: false
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
                :get-row-id="(row) => String(row.id)"
                loading-color="primary"
                loading-animation="carousel"
                :data="props.faqs"
                :onSelect="onRowSelect"
                :empty="$t('tickets.noResults')"
                sticky
                cellpadding=20
                class="flex-1 text-xs min-h-55"
            >

                <template #topic-header>
                    <span class="font-bold">{{ t('tickets.ticketTopicCol') }}</span>
                </template>
                <template #topic-cell="{ row }">
                    <div class="flex items-center gap-2">
                        <UIcon
                            name="i-lucide-chevron-right"
                            class="size-4 text-gray-500 transition-transform duration-200"
                            :class="row.getIsExpanded() ? 'rotate-90' : ''"
                        />
                        <MDC
                            :key="row.original.id"
                            :value="row.original.topic"
                            class="font-semibold text-gray-900 dark:text-gray-100 [&_*]:!my-0"
                        />
                    </div>
                </template>

                <template #expanded="{ row }">
                    <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
                        <MDC :key="row.original.id" :value="row.original.content" class="[&_*]:!my-0"/>
                    </div>
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
