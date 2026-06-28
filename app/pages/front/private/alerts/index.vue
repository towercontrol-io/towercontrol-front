<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type {
    AlertHistoryEntryItf,
    AlertSentEntryItf,
    AlertMediumStateItf,
    AlertState,
    AlertMedium,
} from '~/types';

definePageMeta({ layout: 'main-layout', layoutProps: { title: 'alertHistory' } });

const { t } = useI18n();
const nuxtApp = useNuxtApp();
const appStore = applicationStore();

const UButton = resolveComponent('UButton');
const UBadge  = resolveComponent('UBadge');
const UIcon   = resolveComponent('UIcon');

// ── Role helpers ──────────────────────────────────────────────────────────────

function isGodAdmin(): boolean {
    try {
        const jwt = appStore.getBackendJWT();
        if (!jwt) return false;
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return Array.isArray(payload.roles) && payload.roles.includes('ROLE_GOD_ADMIN');
    } catch {
        return false;
    }
}
const adminView = isGodAdmin();

// ── Expand state ──────────────────────────────────────────────────────────────

const expandedRows = ref<Record<string, boolean>>({});

const toggleExpand = (id: string) => {
    if (expandedRows.value[id]) {
        expandedRows.value = {};
    } else {
        expandedRows.value = { [id]: true };
    }
};

// ── Pagination & filter state ─────────────────────────────────────────────────

const page     = ref(0);
const pageSize = ref(20);
const total    = ref(0);
const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
];

const templateIdFilter = ref<string[]>([]);
const templateIdInput  = ref('');

const addTemplateFilter = () => {
    const val = templateIdInput.value.trim();
    if (val && !templateIdFilter.value.includes(val)) {
        templateIdFilter.value.push(val);
        page.value = 0;
    }
    templateIdInput.value = '';
};
const removeTemplateFilter = (id: string) => {
    templateIdFilter.value = templateIdFilter.value.filter(x => x !== id);
    page.value = 0;
};

// ── Data ─────────────────────────────────────────────────────────────────────

interface AlertDisplayEntry extends AlertHistoryEntryItf {
    _uid: string;
}

const loading   = ref(false);
const loadError = ref<string | null>(null);
const alerts    = ref<AlertDisplayEntry[]>([]);

const load = async () => {
    loading.value   = true;
    loadError.value = null;
    expandedRows.value = {};
    const res = await nuxtApp.$apiBackendAlerts.alertHistoryList({
        page: page.value,
        size: pageSize.value,
        templateIds: templateIdFilter.value,
    });
    loading.value = false;
    if (res.success) {
        alerts.value = res.success.alerts.map((a, i) => ({ ...a, _uid: `${page.value}-${i}` }));
        total.value  = res.success.total;
    } else {
        loadError.value = t('alertsHistory.' + ((res.error as any)?.message ?? 'unknownError'));
        alerts.value = [];
        total.value  = 0;
    }
};

onMounted(load);
watch([page, pageSize, templateIdFilter], load, { deep: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (ms: number): string =>
    ms > 0 ? new Date(ms).toLocaleString() : '';

const stateLabel = (s: AlertState): string => ({
    PENDING:       t('alertsHistory.statePending'),
    PENDING_QUEUE: t('alertsHistory.statePending'),
    RUNNING:       t('alertsHistory.stateRunning'),
    ENDING:        t('alertsHistory.stateEnding'),
    ENDING_QUEUE:  t('alertsHistory.stateEnding'),
    ENDED:         t('alertsHistory.stateEnded'),
} as Record<AlertState, string>)[s] ?? s;

const stateColor = (s: AlertState): string => {
    if (s === 'ENDED')                          return 'neutral';
    if (s === 'RUNNING')                        return 'success';
    if (s === 'ENDING' || s === 'ENDING_QUEUE') return 'warning';
    return 'info';
};

type DeliveryStatus = 'pending' | 'acknowledged' | 'sent' | 'failed';

const deliveryStatus = (sent: AlertSentEntryItf[]): DeliveryStatus => {
    if (!sent?.length) return 'pending';
    const all = sent.flatMap(e => e.state ?? []);
    if (all.some(s => s.sent && s.ack)) return 'acknowledged';
    if (all.some(s => s.sent))          return 'sent';
    return 'failed';
};

const deliveryLabel = (status: DeliveryStatus): string => ({
    pending:      t('alertsHistory.deliveryPending'),
    sent:         t('alertsHistory.deliverySent'),
    acknowledged: t('alertsHistory.deliveryAcknowledged'),
    failed:       t('alertsHistory.deliveryFailed'),
}[status]);

const deliveryColor = (status: DeliveryStatus): string => ({
    pending:      'neutral',
    sent:         'info',
    acknowledged: 'success',
    failed:       'error',
}[status]);

const mediumIcon = (medium: AlertMedium): string => ({
    EMAIL:    'i-lucide-mail',
    SMS:      'i-lucide-message-square',
    PUSH:     'i-lucide-bell',
    WHATSAPP: 'i-lucide-message-circle',
    WEBHOOK:  'i-lucide-webhook',
    TOPIC:    'i-lucide-rss',
    POPUP:    'i-lucide-square-square',
    DEFAULT:  'i-lucide-zap',
} as Record<AlertMedium, string>)[medium] ?? 'i-lucide-send';

interface DeliveryRow {
    userLogin: string;
    medium: AlertMedium;
    sent: boolean;
    sentMs: number;
    ack: boolean;
    ackMs: number;
    error: string;
}

const deliveryRows = (sentEntries: AlertSentEntryItf[]): DeliveryRow[] =>
    sentEntries.flatMap(entry =>
        (entry.state ?? []).map((s: AlertMediumStateItf) => ({
            userLogin: entry.userLogin,
            medium:    s.medium,
            sent:      s.sent,
            sentMs:    s.sentMs,
            ack:       s.ack,
            ackMs:     s.ackMs,
            error:     s.error,
        }))
    );

// ── Column definitions ────────────────────────────────────────────────────────

const tableDef = computed((): TableColumn<AlertDisplayEntry>[] => {
    const cols: TableColumn<AlertDisplayEntry>[] = [
        {
            id: 'expand',
            cell: ({ row }) => h(UButton, {
                icon: expandedRows.value[row.id] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down',
                size: 'xs',
                variant: 'ghost',
                color: 'neutral',
                onClick: () => toggleExpand(row.id),
            }),
        },
        {
            accessorKey: 'alertDefRef',
            header: t('alertsHistory.colSource'),
            cell: ({ row }) => h('span', {
                class: 'font-mono text-xs text-muted truncate block max-w-[10rem]',
                title: row.original.alertDefRef,
            }, row.original.alertDefRef || '—'),
        },
        {
            accessorKey: 'alertTemplateId',
            header: t('alertsHistory.colTemplate'),
            cell: ({ row }) => h(UBadge, {
                label: row.original.alertTemplateId || '—',
                variant: 'outline',
                color: 'neutral',
            }),
        },
        {
            accessorKey: 'deviceId',
            header: t('alertsHistory.colDevice'),
            cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, row.original.deviceId || '—'),
        },
        {
            accessorKey: 'state',
            header: t('alertsHistory.colState'),
            cell: ({ row }) => h(UBadge, {
                label: stateLabel(row.original.state),
                color: stateColor(row.original.state),
                variant: 'subtle',
            }),
        },
        {
            accessorKey: 'requestMs',
            header: t('alertsHistory.colEventTime'),
            cell: ({ row }) => h('span', { class: 'text-xs' }, fmtDate(row.original.requestMs)),
        },
        {
            accessorKey: 'fireMs',
            header: t('alertsHistory.colFireTime'),
            cell: ({ row }) => h('span', {
                class: row.original.fireMs ? 'text-xs' : 'text-xs text-muted',
            }, row.original.fireMs ? fmtDate(row.original.fireMs) : t('alertsHistory.noFireTime')),
        },
        {
            id: 'delivery',
            header: t('alertsHistory.colDelivery'),
            cell: ({ row }) => {
                const status = deliveryStatus(row.original.sent);
                return h(UBadge, {
                    label: deliveryLabel(status),
                    color: deliveryColor(status),
                    variant: 'subtle',
                });
            },
        },
    ];

    if (adminView) {
        cols.push(
            {
                id: 'groups',
                header: t('alertsHistory.colGroups'),
                cell: ({ row }) => h('span', { class: 'text-xs text-muted' },
                    row.original.targetedGroups.join(', ') || '—'),
            },
            {
                id: 'recipients',
                header: t('alertsHistory.colRecipients'),
                cell: ({ row }) => h('span', { class: 'text-xs text-muted' },
                    String(row.original.sent.length)),
            },
        );
    }

    return cols;
});
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-6xl mx-auto mb-4">

        <!-- Page header -->
        <UPageCard
            :title="adminView ? $t('alertsHistory.pageTitleAdmin') : $t('alertsHistory.pageTitle')"
            :description="adminView ? $t('alertsHistory.pageDescriptionAdmin') : $t('alertsHistory.pageDescription')"
            variant="naked"
            orientation="horizontal"
            class="mb-4"
        >
            <UButton
                icon="i-lucide-refresh-cw"
                variant="ghost"
                color="neutral"
                :loading="loading"
                class="w-fit lg:ms-auto"
                @click="load()"
            >
                {{ $t('alertsHistory.refresh') }}
            </UButton>
        </UPageCard>

        <!-- Filter + page size bar -->
        <UCard variant="subtle">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <!-- Template filter -->
                <div class="flex items-center gap-2 flex-wrap flex-1">
                    <span class="text-xs text-muted shrink-0">{{ $t('alertsHistory.filterTemplate') }}</span>
                    <UInput
                        v-model="templateIdInput"
                        :placeholder="$t('alertsHistory.filterTemplatePlaceholder')"
                        class="w-40"
                        size="sm"
                        @keyup.enter="addTemplateFilter()"
                    />
                    <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-plus" @click="addTemplateFilter()" />
                    <UBadge
                        v-for="id in templateIdFilter"
                        :key="id"
                        variant="subtle"
                        color="info"
                        class="cursor-pointer gap-1"
                        @click="removeTemplateFilter(id)"
                    >
                        {{ id }}
                        <UIcon name="i-lucide-x" class="w-3 h-3" />
                    </UBadge>
                </div>
                <!-- Page size -->
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-muted">{{ $t('alertsHistory.pageSizeLabel') }}</span>
                    <USelectMenu
                        v-model="pageSize"
                        value-key="value"
                        :items="pageSizeOptions"
                        class="w-20"
                        size="sm"
                        @update:model-value="page = 0"
                    />
                </div>
            </div>
        </UCard>

        <!-- Table -->
        <UCard class="w-full" variant="subtle">
            <template #default>
                <div class="relative">
                    <UTable
                        v-model:expanded="expandedRows"
                        :get-row-id="(row) => row._uid"
                        :loading="loading"
                        loading-color="primary"
                        loading-animation="carousel"
                        :data="alerts"
                        :columns="tableDef"
                        :empty="$t('alertsHistory.empty')"
                        :ui="{ tr: 'odd:bg-white dark:odd:bg-transparent even:bg-neutral-50 dark:even:bg-elevated/20' }"
                        sticky
                        class="flex-1 text-xs min-h-55"
                    >
                        <template #expanded="{ row }">
                            <div v-if="expandedRows[row.original._uid]" class="px-4 py-3 bg-elevated/20 flex flex-col gap-3">

                                <!-- Error message -->
                                <p v-if="row.original.error" class="text-xs text-red-500 italic">
                                    {{ row.original.error }}
                                </p>

                                <!-- Delivery sub-table -->
                                <div v-if="deliveryRows(row.original.sent).length === 0" class="text-xs text-muted italic">
                                    {{ $t('alertsHistory.noDelivery') }}
                                </div>
                                <table v-else class="w-full text-xs border-collapse">
                                    <thead>
                                        <tr class="text-left text-muted border-b border-default">
                                            <th v-if="adminView" class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColUser') }}</th>
                                            <th class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColMedium') }}</th>
                                            <th class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColSent') }}</th>
                                            <th class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColSentAt') }}</th>
                                            <th class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColAck') }}</th>
                                            <th class="pb-1 pr-4 font-medium">{{ $t('alertsHistory.subColAckAt') }}</th>
                                            <th class="pb-1 font-medium">{{ $t('alertsHistory.subColError') }}</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-default/40">
                                        <tr v-for="(dr, rIdx) in deliveryRows(row.original.sent)" :key="rIdx" class="hover:bg-elevated/30">
                                            <td v-if="adminView" class="py-1.5 pr-4 font-mono text-muted truncate max-w-[8rem]">
                                                {{ dr.userLogin }}
                                            </td>
                                            <td class="py-1.5 pr-4">
                                                <div class="flex items-center gap-1.5">
                                                    <UIcon :name="mediumIcon(dr.medium)" class="w-3.5 h-3.5 text-muted shrink-0" />
                                                    {{ dr.medium }}
                                                </div>
                                            </td>
                                            <td class="py-1.5 pr-4">
                                                <UBadge :label="dr.sent ? '✓' : '✗'" :color="dr.sent ? 'success' : 'error'" variant="subtle" size="sm" />
                                            </td>
                                            <td class="py-1.5 pr-4 text-muted">{{ fmtDate(dr.sentMs) }}</td>
                                            <td class="py-1.5 pr-4">
                                                <UBadge :label="dr.ack ? '✓' : '✗'" :color="dr.ack ? 'success' : 'neutral'" variant="subtle" size="sm" />
                                            </td>
                                            <td class="py-1.5 pr-4 text-muted">{{ fmtDate(dr.ackMs) }}</td>
                                            <td class="py-1.5 text-red-500 italic">{{ dr.error }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </template>
                    </UTable>

                    <!-- Error overlay -->
                    <div v-if="loadError"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="text-lg text-center text-red-600 font-bold">{{ loadError }}</div>
                            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="load()">
                                {{ $t('alertsHistory.refresh') }}
                            </UButton>
                        </div>
                    </div>
                </div>
            </template>
        </UCard>

        <!-- Pagination -->
        <div v-if="total > 0" class="flex items-center justify-between gap-4 px-1">
            <UPagination
                :show-controls="true"
                :sibling-count="1"
                show-edges
                active-color="neutral"
                :page="page + 1"
                :items-per-page="pageSize"
                :total="total"
                @update:page="(p) => { page = p - 1; load(); }"
                class="ml-auto"
            />
        </div>

    </div>
</template>
