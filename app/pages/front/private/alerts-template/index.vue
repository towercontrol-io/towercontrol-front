<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { AlertTemplateItf, AlertBehavior } from '~/types';

definePageMeta({ layout: 'main-layout', layoutProps: { title: 'alertTemplates' } });

const { t } = useI18n();
const nuxtApp = useNuxtApp();
const router = useRouter();
const appStore = applicationStore();

const UButton = resolveComponent('UButton');
const UBadge  = resolveComponent('UBadge');

const componentCtx = reactive({
    loading: false as boolean,
    loadingError: null as string | null,
    templates: [] as AlertTemplateItf[],
    search: '' as string,
    deleteConfirmLayer: false as boolean,
    templateToDelete: null as AlertTemplateItf | null,
    deleteError: null as string | null,
});

// ---- Derived owner hash (login hash stored in JWT) ----
function getOwnerLogin(): string | null {
    try {
        const jwt = appStore.getBackendJWT();
        if (!jwt) return null;
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.sub ?? payload.login ?? null;
    } catch {
        return null;
    }
}

function isAlertAdmin(): boolean {
    try {
        const jwt = appStore.getBackendJWT();
        if (!jwt) return false;
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return Array.isArray(payload.roles) && (
            payload.roles.includes('ROLE_ALERTS_ADMIN') ||
            payload.roles.includes('ROLE_GOD_ADMIN')
        );
    } catch {
        return false;
    }
}

// ---- Load templates ----
const loadTemplates = () => {
    componentCtx.loading = true;
    componentCtx.loadingError = null;
    const params = componentCtx.search.trim() ? { search: componentCtx.search.trim() } : undefined;
    nuxtApp.$apiBackendAlerts.alertTemplateList(params).then((res) => {
        if (res.success) {
            componentCtx.templates = res.success.templates;
        } else if (res.error) {
            componentCtx.loadingError = t('alertsTemplate.' + ((res.error as any).message ?? 'unknownError'));
        }
    }).catch(() => {
        componentCtx.loadingError = t('alertsTemplate.unknownError');
    }).finally(() => {
        componentCtx.loading = false;
    });
};

onMounted(() => {
    loadTemplates();
});

// ---- Search debounce ----
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => componentCtx.search, () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTemplates(), 400);
});

// ---- Delete ----
const onDeleteTemplate = (tpl: AlertTemplateItf) => {
    componentCtx.templateToDelete = tpl;
    componentCtx.deleteError = null;
    componentCtx.deleteConfirmLayer = true;
};

const onConfirmDelete = async () => {
    if (!componentCtx.templateToDelete?.shortId) return;
    const res = await nuxtApp.$apiBackendAlerts.alertTemplateDelete(componentCtx.templateToDelete.shortId);
    if (res.success) {
        componentCtx.templates = componentCtx.templates.filter(t => t.shortId !== componentCtx.templateToDelete!.shortId);
        componentCtx.deleteConfirmLayer = false;
        componentCtx.templateToDelete = null;
        useToast().add({ title: t('alertsTemplate.deleteSuccess'), icon: 'i-lucide-trash-2', color: 'success', duration: 3000 });
    } else {
        componentCtx.deleteError = t('alertsTemplate.' + ((res.error as any)?.message ?? 'unknownError'));
    }
};

const onCancelDelete = () => {
    componentCtx.deleteConfirmLayer = false;
    componentCtx.templateToDelete = null;
    componentCtx.deleteError = null;
};

// ---- Helpers ----
const behaviorLabel = (b: AlertBehavior): string => {
    const map: Record<AlertBehavior, string> = {
        FIRE_FORGET: t('alertsTemplate.behaviorFireForget'),
        FIRE_TO_END: t('alertsTemplate.behaviorFireToEnd'),
        FIRE_UNTIL:  t('alertsTemplate.behaviorFireUntil'),
        SILENT:      t('alertsTemplate.behaviorSilent'),
    };
    return map[b] ?? b;
};

const behaviorColor = (b: AlertBehavior): string => {
    const map: Record<AlertBehavior, string> = {
        FIRE_FORGET: 'info',
        FIRE_TO_END: 'warning',
        FIRE_UNTIL:  'warning',
        SILENT:      'neutral',
    };
    return map[b] ?? 'neutral';
};

const canDelete = (tpl: AlertTemplateItf): boolean => {
    if (isAlertAdmin()) return true;
    return tpl.owner === getOwnerLogin();
};

// ---- Table columns ----
const tableDef = computed((): TableColumn<AlertTemplateItf>[] => [
    {
        accessorKey: 'shortId',
        header: t('alertsTemplate.colId'),
        cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.getValue('shortId') as string)
    },
    {
        accessorKey: 'name',
        header: t('alertsTemplate.colName'),
        cell: ({ row }) => {
            const tpl = row.original;
            const parts: any[] = [h('span', { class: 'font-medium' }, tpl.name)];
            if (tpl.description) {
                parts.push(h('span', { class: 'text-xs text-muted truncate max-w-[18rem]' }, tpl.description));
            }
            return h('div', { class: 'flex flex-col gap-0.5' }, parts);
        }
    },
    {
        accessorKey: 'behavior',
        header: t('alertsTemplate.colBehavior'),
        cell: ({ row }) => {
            const b = row.getValue('behavior') as AlertBehavior;
            return h(UBadge, { label: behaviorLabel(b), variant: 'subtle', color: behaviorColor(b) });
        }
    },
    {
        accessorKey: 'global',
        header: t('alertsTemplate.colGlobal'),
        cell: ({ row }) => row.getValue('global')
            ? h(UBadge, { label: t('alertsTemplate.globalBadge'), variant: 'subtle', color: 'success' })
            : h('span', { class: 'text-muted text-xs' }, '—')
    },
    {
        id: 'locales',
        header: t('alertsTemplate.colLocales'),
        cell: ({ row }) => {
            const tpl = row.original;
            const locales = tpl.open.map(l => l.locale).join(', ');
            return h('span', { class: 'text-xs text-muted' }, locales || '—');
        }
    },
    {
        id: 'actions',
        header: t('alertsTemplate.colActions'),
        cell: ({ row }) => {
            const tpl = row.original;
            return h('div', { class: 'flex items-center gap-2' }, [
                h(UButton, {
                    icon: 'i-lucide-pencil',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'neutral',
                    'aria-label': t('alertsTemplate.actionEdit'),
                    onClick: () => router.push(`/front/private/alerts-template/${tpl.shortId}`)
                }),
                h(UButton, {
                    icon: 'i-lucide-trash-2',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'error',
                    disabled: !canDelete(tpl),
                    'aria-label': t('alertsTemplate.actionDelete'),
                    onClick: () => onDeleteTemplate(tpl)
                })
            ]);
        }
    }
]);
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">

        <UPageCard
            :title="$t('alertsTemplate.pageTitle')"
            :description="$t('alertsTemplate.pageDescription')"
            variant="naked"
            orientation="horizontal"
            class="mb-4"
        >
            <UButton
                :label="$t('alertsTemplate.newTemplate')"
                icon="i-lucide-plus"
                color="neutral"
                class="w-fit lg:ms-auto"
                @click="router.push('/front/private/alerts-template/_')"
            />
        </UPageCard>

        <UCard class="w-full max-w-4xl mx-auto" variant="subtle">
            <template #header>
                <div class="flex items-center gap-3">
                    <UInput
                        v-model="componentCtx.search"
                        :placeholder="$t('alertsTemplate.searchPlaceholder')"
                        icon="i-lucide-search"
                        class="flex-1"
                    />
                    <UButton
                        icon="i-lucide-refresh-cw"
                        variant="ghost"
                        color="neutral"
                        :loading="componentCtx.loading"
                        :aria-label="$t('alertsTemplate.refresh')"
                        @click="loadTemplates()"
                    />
                </div>
            </template>

            <template #default>
                <div class="relative">
                    <UTable
                        :loading="componentCtx.loading"
                        loading-color="primary"
                        loading-animation="carousel"
                        :data="componentCtx.templates"
                        :columns="tableDef"
                        :empty="$t('alertsTemplate.listEmpty')"
                        sticky
                        class="flex-1 text-xs min-h-55"
                    />

                    <div
                        v-if="componentCtx.loadingError"
                        class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div class="flex flex-col items-center gap-4">
                            <div class="text-lg text-center text-red-600 font-bold">
                                {{ componentCtx.loadingError }}
                            </div>
                            <UButton
                                icon="i-lucide-refresh-cw"
                                color="neutral"
                                variant="soft"
                                @click="loadTemplates()"
                            >
                                {{ $t('alertsTemplate.retry') }}
                            </UButton>
                        </div>
                    </div>

                    <div
                        v-if="componentCtx.deleteConfirmLayer"
                        class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div class="flex flex-col items-center gap-4">
                            <div class="text-sm text-center font-medium">
                                {{ $t('alertsTemplate.deleteConfirmDesc', { name: componentCtx.templateToDelete?.name }) }}
                            </div>
                            <div v-if="componentCtx.deleteError" class="text-sm text-red-600 text-center">
                                {{ componentCtx.deleteError }}
                            </div>
                            <div class="flex gap-4">
                                <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onConfirmDelete()">
                                    {{ $t('alertsTemplate.deleteConfirm') }}
                                </UButton>
                                <UButton icon="i-lucide-circle-x" variant="soft" color="neutral" @click="onCancelDelete()">
                                    {{ $t('alertsTemplate.deleteCancel') }}
                                </UButton>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </UCard>

    </div>
</template>
