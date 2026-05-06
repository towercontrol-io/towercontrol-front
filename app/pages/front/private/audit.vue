<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui';
    import type { AuditResponse } from '~/types';
    import { applicationStore } from '~/stores/app';
    import { getLocalTimeZone } from '@internationalized/date';

    definePageMeta({ layout: 'main-layout', layoutProps: { title: 'auditAdmin' } });

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    const appStore = applicationStore();

    const UBadge  = resolveComponent('UBadge');
    const UIcon   = resolveComponent('UIcon');

    // ---- Access control ----
    onMounted(async () => {
        if (!appStore.isAuditAdmin()) {
            await router.push('/front/public/error');
            return;
        }
        await loadLogs();
    });

    // ---- Search / filter state ----
    const searchText  = ref('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startDate   = ref<any>(undefined);
    const startTime   = ref('00:00');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const endDate     = ref<any>(undefined);
    const endTime     = ref('23:59');
    const dateError   = ref<string | null>(null);
    const currentPage = ref(1);   // 1-based for UPagination; converted to 0-based for API
    const pageSize    = ref(50);

    const pageSizeOptions = [
        { label: '25',  value: 25 },
        { label: '50',  value: 50 },
        { label: '100', value: 100 },
        { label: '200', value: 200 },
    ];

    // ---- Result state ----
    const loading       = ref(false);
    const loadingError  = ref<string | null>(null);
    const nonDatabase   = ref(false);
    const logs          = ref<AuditResponse[]>([]);
    const total         = ref(0);
    const totalPages    = ref(0);

    // ---- Helpers ----
    function encodeSearchParam(value: string): string | '' {
        const trimmed = value.trim();
        if (!trimmed) return '';
        return btoa(unescape(encodeURIComponent(trimmed)));
    }

    function dateTimeToMs(date: any, time: string): number {
        if (!date) return 0;
        const d = date.toDate(getLocalTimeZone());
        const [h, m] = time.split(':').map(Number);
        d.setHours(h ?? 0, m ?? 0, 0, 0);
        return d.getTime();
    }

    function formatFilterLabel(date: any, time: string): string {
        if (!date) return '';
        const d = date.toDate(getLocalTimeZone());
        const [h, m] = time.split(':').map(Number);
        d.setHours(h ?? 0, m ?? 0, 0, 0);
        return d.toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    }

    function formatDateTime(ms: number): string {
        return new Date(ms).toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    }

    // ---- Load ----
    async function loadLogs() {
        dateError.value = null;

        const startMs = dateTimeToMs(startDate.value, startTime.value);
        const endMs   = dateTimeToMs(endDate.value, endTime.value);

        if (startMs > 0 && endMs > 0 && startMs >= endMs) {
            dateError.value = t('audit.searchInvalidDateRange');
            return;
        }

        loading.value      = true;
        loadingError.value = null;
        nonDatabase.value  = false;

        const res = await nuxtApp.$apiBackendAudit.auditModuleListAndSearch(
            searchText.value.trim(),
            startMs,
            endMs,
            currentPage.value - 1,
            pageSize.value,
        );

        loading.value = false;

        if (res.success) {
            if (res.success.status === 'audit-log-non-database') {
                nonDatabase.value = true;
                logs.value        = [];
                total.value       = 0;
                totalPages.value  = 0;
            } else {
                logs.value       = res.success.logs;
                total.value      = res.success.total;
                totalPages.value = res.success.totalPages;
            }
        } else {
            const msg = (res.error as any)?.message ?? 'unknownError';
            if (msg === 'audit-search-invalid-date-range') {
                dateError.value = t('audit.searchInvalidDateRange');
            } else {
                loadingError.value = t('audit.' + msg) || t('login.' + msg) || msg;
            }
        }
    }

    // Pagination watcher
    watch(currentPage, loadLogs);

    // Page size watcher – reset to page 1
    watch(pageSize, () => {
        if (currentPage.value !== 1) { currentPage.value = 1; }
        else { loadLogs(); }
    });

    function onSearch() {
        if (currentPage.value !== 1) { currentPage.value = 1; }
        else { loadLogs(); }
    }

    // ---- Pagination display ----
    const showingFrom = computed(() => total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1);
    const showingTo   = computed(() => Math.min(currentPage.value * pageSize.value, total.value));

    // ---- Table columns ----
    const tableDef = computed((): TableColumn<AuditResponse>[] => [
        {
            accessorKey: 'actionMs',
            header: t('audit.colDatetime'),
            cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-xs' }, formatDateTime(row.original.actionMs)),
        },
        {
            accessorKey: 'service',
            header: t('audit.colService'),
            cell: ({ row }) => h(UBadge, {
                label: row.original.service,
                variant: 'subtle',
                color: 'primary',
                class: 'font-mono',
            }),
        },
        {
            accessorKey: 'action',
            header: t('audit.colAction'),
            cell: ({ row }) => h(UBadge, {
                label: row.original.action,
                variant: 'outline',
                color: 'neutral',
                class: 'font-mono text-xs',
            }),
        },
        {
            accessorKey: 'owner',
            header: t('audit.colOwner'),
            cell: ({ row }) => h('span', {
                class: 'font-mono text-[0.65rem] text-muted truncate max-w-[8rem] block',
                title: row.original.owner,
            }, row.original.owner),
        },
        {
            accessorKey: 'logStr',
            header: t('audit.colLog'),
            cell: ({ row }) => h('span', {
                class: 'text-xs break-words whitespace-pre-wrap max-w-[28rem] block',
            }, row.original.logStr),
        },
        {
            accessorKey: 'linkChain',
            header: t('audit.colLinkChain'),
            cell: ({ row }) => h(UIcon, {
                name: row.original.linkChain ? 'i-lucide-link' : 'i-lucide-link-2-off',
                class: row.original.linkChain
                    ? 'w-4 h-4 text-success-500'
                    : 'w-4 h-4 text-error-500',
            }),
        },
    ]);
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-7xl mx-auto mb-4">

        <UPageCard
            :title="$t('audit.pageTitle')"
            :description="$t('audit.pageDescription')"
            variant="naked"
            orientation="horizontal"
            class="mb-2"
        />

        <!-- Search / filter toolbar -->
        <form class="flex flex-wrap gap-3 items-end" @submit.prevent="onSearch">
            <UInput
                v-model="searchText"
                icon="i-lucide-search"
                :placeholder="$t('audit.searchPlaceholder')"
                class="flex-1 min-w-[14rem]"
            />

            <UPopover>
                <UButton
                    :label="startDate ? formatFilterLabel(startDate, startTime) : $t('audit.filterFrom')"
                    :icon="startDate ? 'i-lucide-calendar-check' : 'i-lucide-calendar'"
                    variant="outline"
                    color="neutral"
                    trailing-icon="i-lucide-chevron-down"
                />
                <template #content>
                    <UCalendar
                        v-model="startDate"
                        class="p-2"
                    />
                    <div class="flex items-center gap-2 px-3 pb-2 pt-1 border-t border-default">
                        <UIcon name="i-lucide-clock" class="w-4 h-4 text-muted shrink-0" />
                        <input
                            v-model="startTime"
                            type="time"
                            class="flex-1 bg-transparent text-sm outline-none"
                        />
                        <UButton size="xs" variant="ghost" color="neutral" @click="startDate = undefined; startTime = '00:00'">
                            {{ $t('audit.filterClear') }}
                        </UButton>
                    </div>
                </template>
            </UPopover>

            <UPopover>
                <UButton
                    :label="endDate ? formatFilterLabel(endDate, endTime) : $t('audit.filterTo')"
                    :icon="endDate ? 'i-lucide-calendar-check' : 'i-lucide-calendar'"
                    variant="outline"
                    color="neutral"
                    trailing-icon="i-lucide-chevron-down"
                />
                <template #content>
                    <UCalendar
                        v-model="endDate"
                        class="p-2"
                    />
                    <div class="flex items-center gap-2 px-3 pb-2 pt-1 border-t border-default">
                        <UIcon name="i-lucide-clock" class="w-4 h-4 text-muted shrink-0" />
                        <input
                            v-model="endTime"
                            type="time"
                            class="flex-1 bg-transparent text-sm outline-none"
                        />
                        <UButton size="xs" variant="ghost" color="neutral" @click="endDate = undefined; endTime = '23:59'">
                            {{ $t('audit.filterClear') }}
                        </UButton>
                    </div>
                </template>
            </UPopover>

            <UButton
                type="submit"
                icon="i-lucide-search"
                color="primary"
                :loading="loading"
            >
                {{ $t('audit.searchButton') }}
            </UButton>

            <USelectMenu
                v-model="pageSize"
                value-key="value"
                :items="pageSizeOptions"
                class="w-24"
            />
        </form>

        <!-- Date range validation error -->
        <UAlert
            v-if="dateError"
            icon="i-lucide-alert-triangle"
            color="error"
            variant="soft"
            :description="dateError"
        />

        <!-- Non-database backend notice -->
        <UAlert
            v-if="nonDatabase"
            icon="i-lucide-database-zap"
            color="warning"
            variant="soft"
            :description="$t('audit.nonDatabase')"
        />

        <!-- Main table card -->
        <UCard v-if="!nonDatabase" class="w-full" variant="subtle">
            <template #default>
                <UTable
                    :loading="loading"
                    loading-color="primary"
                    loading-animation="carousel"
                    :data="logs"
                    :columns="tableDef"
                    :empty="$t('audit.noResults')"
                    class="text-xs"
                />

                <!-- Backend error overlay -->
                <div v-if="loadingError"
                     class="mt-4 text-sm text-center text-error-600 font-medium">
                    {{ loadingError }}
                </div>
            </template>

            <template #footer>
                <div class="flex items-center justify-between gap-4 flex-wrap">
                    <span class="text-xs text-muted">
                        {{ $t('audit.showing', { from: showingFrom, to: showingTo, total: total }) }}
                        &nbsp;—&nbsp;
                        {{ $t('audit.pageOf', { current: currentPage, total: totalPages }) }}
                    </span>
                    <UPagination
                        v-model:page="currentPage"
                        :total="total"
                        :items-per-page="pageSize"
                        size="xs"
                    />
                </div>
            </template>
        </UCard>

    </div>
</template>
