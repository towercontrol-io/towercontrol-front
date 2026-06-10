<script setup lang="ts">
import type {
    AlertTemplateItf,
    AlertTemplateBodyItf,
    AlertBehavior,
    AlertMedium,
    AlertParameterType,
    AlertParameterItf,
    AlertLocaleMessagesItf,
    AlertMediumMessageItf,
} from '~/types';

definePageMeta({ layout: 'main-layout', layoutProps: { title: 'alertTemplates' } });

const { t } = useI18n();
const nuxtApp = useNuxtApp();
const router = useRouter();
const route = useRoute();
const appStore = applicationStore();

const templateId = computed(() => route.params.id as string);
const isCreateMode = computed(() => templateId.value === '_');

// ---- Role helpers ----
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

// ---- Page state ----
const pageState = reactive({
    loading: false,
    saving: false,
    loadError: null as string | null,
    saveError: null as string | null,
});

// ---- Form state ----
interface FormState {
    name: string;
    description: string;
    global: boolean;
    behavior: AlertBehavior;
    durationMin: number;
    preferred: AlertMedium[];
    parameters: AlertParameterItf[];
    open: AlertLocaleMessagesItf[];
    close: AlertLocaleMessagesItf[];
}

const form = reactive<FormState>({
    name: '',
    description: '',
    global: false,
    behavior: 'FIRE_FORGET',
    durationMin: 0,
    preferred: [],
    parameters: [],
    open: [],
    close: [],
});

// ---- Options ----
const behaviorOptions = computed(() => [
    { label: t('alertsTemplate.behaviorFireForget'), value: 'FIRE_FORGET' as AlertBehavior },
    { label: t('alertsTemplate.behaviorFireToEnd'),  value: 'FIRE_TO_END' as AlertBehavior },
    { label: t('alertsTemplate.behaviorFireUntil'),  value: 'FIRE_UNTIL'  as AlertBehavior },
    { label: t('alertsTemplate.behaviorSilent'),     value: 'SILENT'      as AlertBehavior },
]);

const mediumOptions = computed(() => ([
    'EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'WEBHOOK', 'TOPIC', 'DEFAULT'
] as AlertMedium[]).map(m => ({ label: m, value: m })));

const paramTypeOptions = computed(() => ([
    'DEVICE_ID', 'DEVICE_NAME', 'GROUP_NAME', 'USER_FIRSTNAME', 'USER_LASTNAME',
    'USER_GENDER', 'ALERT_TIME', 'ALERT_DATE_TIME', 'CUSTOM_PARAM',
    'SERVICE_NAME', 'SERVICE_HOME', 'ALERT_LINK',
] as AlertParameterType[]).map(p => ({ label: p, value: p })));

const localeOptions = [
    { label: '🇫🇷 fr', value: 'fr' },
    { label: '🇬🇧 en', value: 'en' },
    { label: '🇪🇸 es', value: 'es' },
    { label: '🇩🇪 de', value: 'de' },
    { label: '🇮🇹 it', value: 'it' },
    { label: '🇵🇹 pt', value: 'pt' },
    { label: '🇳🇱 nl', value: 'nl' },
    { label: '🇵🇱 pl', value: 'pl' },
    { label: '🇯🇵 ja', value: 'ja' },
    { label: '🇨🇳 zh', value: 'zh' },
    { label: '🇧🇷 pt-BR', value: 'pt-BR' },
    { label: '🇦🇷 es-AR', value: 'es-AR' },
];

const showDuration = computed(() => form.behavior === 'FIRE_TO_END' || form.behavior === 'FIRE_UNTIL');
const showClose    = computed(() => form.behavior === 'FIRE_TO_END' || form.behavior === 'FIRE_UNTIL');

// ---- Active locale tabs ----
const activeOpenLocale  = ref('');
const activeCloseLocale = ref('');
const newOpenLocale     = ref('fr');
const newCloseLocale    = ref('fr');

const openTabItems  = computed(() => form.open.map(l => ({ label: l.locale, value: l.locale, slot: l.locale })));
const closeTabItems = computed(() => form.close.map(l => ({ label: l.locale, value: l.locale, slot: l.locale })));

const activeOpenLocaleIdx  = computed(() => form.open.findIndex(l => l.locale === activeOpenLocale.value));
const activeCloseLocaleIdx = computed(() => form.close.findIndex(l => l.locale === activeCloseLocale.value));
const activeOpenLocaleData  = computed(() => form.open[activeOpenLocaleIdx.value]);
const activeCloseLocaleData = computed(() => form.close[activeCloseLocaleIdx.value]);

// ---- Load existing template (edit mode) ----
const populateForm = (tpl: AlertTemplateItf) => {
    form.name        = tpl.name;
    form.description = tpl.description ?? '';
    form.global      = tpl.global;
    form.behavior    = tpl.behavior;
    form.durationMin = Math.round(tpl.durationMs / 60000);
    form.preferred   = [...tpl.preferred];
    form.parameters  = tpl.parameters.map(p => ({ ...p }));
    form.open        = tpl.open.map(l => ({
        locale: l.locale,
        mediums: l.mediums.map(m => ({ ...m }))
    }));
    form.close       = tpl.close.map(l => ({
        locale: l.locale,
        mediums: l.mediums.map(m => ({ ...m }))
    }));
    activeOpenLocale.value  = form.open[0]?.locale  ?? '';
    activeCloseLocale.value = form.close[0]?.locale ?? '';
};

onMounted(async () => {
    if (!isCreateMode.value) {
        pageState.loading = true;
        pageState.loadError = null;
        const res = await nuxtApp.$apiBackendAlerts.alertTemplateList();
        pageState.loading = false;
        if (res.success) {
            const found = res.success.templates.find(t => t.id === templateId.value);
            if (found) {
                populateForm(found);
            } else {
                pageState.loadError = t('alertsTemplate.alerts-template-not-found');
            }
        } else {
            pageState.loadError = t('alertsTemplate.' + ((res.error as any)?.message ?? 'unknownError'));
        }
    }
});

// ---- Parameters ----
const addParameter = () => {
    form.parameters.push({ type: 'DEVICE_NAME', param: '' });
};
const removeParameter = (idx: number) => {
    form.parameters.splice(idx, 1);
};
const moveParameterUp = (idx: number) => {
    if (idx === 0) return;
    const tmp = form.parameters[idx - 1];
    form.parameters[idx - 1] = form.parameters[idx];
    form.parameters[idx] = tmp;
};
const moveParameterDown = (idx: number) => {
    if (idx === form.parameters.length - 1) return;
    const tmp = form.parameters[idx + 1];
    form.parameters[idx + 1] = form.parameters[idx];
    form.parameters[idx] = tmp;
};
const paramNeedsValue = (type: AlertParameterType) =>
    type === 'CUSTOM_PARAM' || type === 'ALERT_LINK';

// ---- Locale management (shared logic for open/close) ----
const usedOpenLocales  = computed(() => form.open.map(l => l.locale));
const usedCloseLocales = computed(() => form.close.map(l => l.locale));

const availableOpenLocales  = computed(() => localeOptions.filter(l => !usedOpenLocales.value.includes(l.value)));
const availableCloseLocales = computed(() => localeOptions.filter(l => !usedCloseLocales.value.includes(l.value)));

const addOpenLocale = () => {
    if (!newOpenLocale.value || usedOpenLocales.value.includes(newOpenLocale.value)) return;
    const source = form.open[0];
    form.open.push({
        locale: newOpenLocale.value,
        mediums: source ? source.mediums.map(m => ({ medium: m.medium, message: '' })) : [],
    });
    activeOpenLocale.value = newOpenLocale.value;
    const next = availableOpenLocales.value[0];
    if (next) newOpenLocale.value = next.value;
};

const removeOpenLocale = (idx: number) => {
    const removed = form.open[idx]?.locale;
    form.open.splice(idx, 1);
    if (activeOpenLocale.value === removed) {
        activeOpenLocale.value = form.open[Math.max(0, idx - 1)]?.locale ?? '';
    }
    const next = availableOpenLocales.value[0];
    if (next) newOpenLocale.value = next.value;
};

const addCloseLocale = () => {
    if (!newCloseLocale.value || usedCloseLocales.value.includes(newCloseLocale.value)) return;
    const source = form.close[0];
    form.close.push({
        locale: newCloseLocale.value,
        mediums: source ? source.mediums.map(m => ({ medium: m.medium, message: '' })) : [],
    });
    activeCloseLocale.value = newCloseLocale.value;
    const next = availableCloseLocales.value[0];
    if (next) newCloseLocale.value = next.value;
};

const removeCloseLocale = (idx: number) => {
    const removed = form.close[idx]?.locale;
    form.close.splice(idx, 1);
    if (activeCloseLocale.value === removed) {
        activeCloseLocale.value = form.close[Math.max(0, idx - 1)]?.locale ?? '';
    }
    const next = availableCloseLocales.value[0];
    if (next) newCloseLocale.value = next.value;
};

// ---- Medium management ----
const addMediumToLocale = (locales: AlertLocaleMessagesItf[], localeIdx: number, medium: AlertMedium) => {
    const locale = locales[localeIdx];
    if (!locale) return;
    if (locale.mediums.some(m => m.medium === medium)) return;
    locale.mediums.push({ medium, message: '' });
};
const removeMediumFromLocale = (locales: AlertLocaleMessagesItf[], localeIdx: number, mediumIdx: number) => {
    locales[localeIdx]?.mediums.splice(mediumIdx, 1);
};

const toggleOpenMedium = (medium: AlertMedium) => {
    if (!activeOpenLocaleData.value) return;
    const mIdx = activeOpenLocaleData.value.mediums.findIndex(x => x.medium === medium);
    if (mIdx >= 0) removeMediumFromLocale(form.open, activeOpenLocaleIdx.value, mIdx);
    else addMediumToLocale(form.open, activeOpenLocaleIdx.value, medium);
};
const toggleCloseMedium = (medium: AlertMedium) => {
    if (!activeCloseLocaleData.value) return;
    const mIdx = activeCloseLocaleData.value.mediums.findIndex(x => x.medium === medium);
    if (mIdx >= 0) removeMediumFromLocale(form.close, activeCloseLocaleIdx.value, mIdx);
    else addMediumToLocale(form.close, activeCloseLocaleIdx.value, medium);
};

// ---- Parameter insertion into medium textareas ----
const mediumCursor = ref<Record<string, { start: number; end: number }>>({});

const saveMediumCursor = (key: string, event: Event) => {
    const ta = event.target as HTMLTextAreaElement;
    mediumCursor.value[key] = { start: ta.selectionStart ?? 0, end: ta.selectionEnd ?? 0 };
};

const insertParam = (mediums: { message: string }[], mIdx: number, key: string, token: string) => {
    const med = mediums[mIdx];
    if (!med) return;
    const pos = mediumCursor.value[key] ?? { start: med.message.length, end: med.message.length };
    med.message = med.message.slice(0, pos.start) + token + med.message.slice(pos.end);
    mediumCursor.value[key] = { start: pos.start + token.length, end: pos.start + token.length };
};

// ---- Preferred channels (ordered) ----
const newPreferredMedium = ref<AlertMedium>('EMAIL');
const availablePreferredOptions = computed(() =>
    mediumOptions.value.filter(m => !form.preferred.includes(m.value))
);
const addPreferred = () => {
    if (!newPreferredMedium.value || form.preferred.includes(newPreferredMedium.value)) return;
    form.preferred.push(newPreferredMedium.value);
    const next = availablePreferredOptions.value[0];
    if (next) newPreferredMedium.value = next.value;
};
const removePreferred = (idx: number) => { form.preferred.splice(idx, 1); };
const movePreferredUp = (idx: number) => {
    if (idx === 0) return;
    [form.preferred[idx - 1], form.preferred[idx]] = [form.preferred[idx], form.preferred[idx - 1]];
};
const movePreferredDown = (idx: number) => {
    if (idx === form.preferred.length - 1) return;
    [form.preferred[idx + 1], form.preferred[idx]] = [form.preferred[idx], form.preferred[idx + 1]];
};

// ---- Validation ----
const validate = (): string | null => {
    if (!form.name.trim()) return t('alertsTemplate.alerts-template-name-required');
    if (form.name.trim().length > 100) return t('alertsTemplate.alerts-template-name-too-long');
    if (form.description.length > 500) return t('alertsTemplate.alerts-template-description-too-long');
    if (!form.behavior) return t('alertsTemplate.alerts-template-behavior-required');
    if (form.open.length === 0) return t('alertsTemplate.alerts-template-open-required');
    for (const locale of form.open) {
        if (!locale.locale) return t('alertsTemplate.alerts-template-locale-required');
        if (locale.mediums.length === 0) return t('alertsTemplate.alerts-template-medium-required');
        for (const m of locale.mediums) {
            if (!m.message.trim()) return t('alertsTemplate.alerts-template-message-required');
        }
    }
    return null;
};

// ---- Save ----
const onSave = async () => {
    pageState.saveError = null;
    const err = validate();
    if (err) { pageState.saveError = err; return; }

    const body: AlertTemplateBodyItf = {
        ...(isCreateMode.value ? {} : { id: templateId.value }),
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
        global:      form.global,
        behavior:    form.behavior,
        durationMs:  showDuration.value ? form.durationMin * 60000 : 0,
        preferred:   [...form.preferred],
        parameters:  form.parameters.map(p => ({
            type: p.type,
            ...(paramNeedsValue(p.type) && p.param ? { param: p.param } : {}),
        })),
        open:  form.open,
        close: showClose.value ? form.close : [],
    };

    pageState.saving = true;
    const res = await nuxtApp.$apiBackendAlerts.alertTemplateSave(body);
    pageState.saving = false;

    if (res.success) {
        useToast().add({
            title: isCreateMode.value ? t('alertsTemplate.createSuccess') : t('alertsTemplate.updateSuccess'),
            icon: 'i-lucide-check-circle',
            color: 'success',
            duration: 3000,
        });
        router.push('/front/private/alerts-template');
    } else {
        pageState.saveError = t('alertsTemplate.' + ((res.error as any)?.message ?? 'unknownError'));
    }
};

const onCancel = () => {
    router.push('/front/private/alerts-template');
};
</script>

<template>
    <div class="flex flex-col gap-6 w-full lg:max-w-4xl mx-auto mb-8">

        <!-- Page header -->
        <UPageCard
            :title="isCreateMode ? $t('alertsTemplate.createTitle') : $t('alertsTemplate.editTitle')"
            variant="naked"
            orientation="horizontal"
            class="mb-2"
        >
            <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                color="neutral"
                class="w-fit lg:ms-auto"
                @click="onCancel()"
            >
                {{ $t('alertsTemplate.backToList') }}
            </UButton>
        </UPageCard>

        <!-- Loading / error state (edit mode only) -->
        <div v-if="pageState.loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-muted" />
        </div>
        <div v-else-if="pageState.loadError" class="text-center text-red-600 py-8 font-medium">
            {{ pageState.loadError }}
        </div>

        <template v-else>

            <!-- ===== Section 1 – General info ===== -->
            <UCard variant="subtle">
                <template #header>
                    <span class="font-semibold">{{ $t('alertsTemplate.sectionGeneral') }}</span>
                </template>
                <div class="flex flex-col gap-4">
                    <UFormField :label="$t('alertsTemplate.fieldName')" required>
                        <UInput v-model="form.name" :placeholder="$t('alertsTemplate.fieldNamePlaceholder')" class="w-full" />
                    </UFormField>

                    <UFormField :label="$t('alertsTemplate.fieldDescription')">
                        <UTextarea v-model="form.description" :placeholder="$t('alertsTemplate.fieldDescriptionPlaceholder')" :rows="2" class="w-full" />
                    </UFormField>

                    <div class="flex gap-4 flex-wrap items-end">
                        <UFormField :label="$t('alertsTemplate.fieldBehavior')" required class="flex-1 min-w-[12rem]">
                            <USelectMenu
                                v-model="form.behavior"
                                value-key="value"
                                :items="behaviorOptions"
                                class="w-full"
                            />
                        </UFormField>

                        <UFormField v-if="showDuration" :label="$t('alertsTemplate.fieldDurationMin')" class="w-44">
                            <UInput v-model.number="form.durationMin" type="number" min="0" class="w-full">
                                <template #trailing>
                                    <span class="text-xs text-muted">min</span>
                                </template>
                            </UInput>
                        </UFormField>
                    </div>

                    <UFormField :label="$t('alertsTemplate.fieldPreferred')" :description="$t('alertsTemplate.fieldPreferredDesc')">
                        <div class="flex flex-col sm:flex-row gap-4 w-full">
                            <!-- Selector (top on mobile, left on desktop) -->
                            <div v-if="availablePreferredOptions.length > 0" class="flex items-start gap-2 shrink-0">
                                <USelectMenu
                                    v-model="newPreferredMedium"
                                    value-key="value"
                                    :items="availablePreferredOptions"
                                    class="w-44"
                                />
                                <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="soft" @click="addPreferred()">
                                    {{ $t('alertsTemplate.addMedium') }}
                                </UButton>
                            </div>
                            <!-- Ordered list (below on mobile, right on desktop) -->
                            <div class="flex flex-col gap-1.5 flex-1">
                                <div
                                    v-for="(medium, idx) in form.preferred"
                                    :key="medium"
                                    class="flex items-center gap-2 p-2 rounded-md bg-elevated/30"
                                >
                                    <span class="text-xs font-mono text-muted w-5 text-right shrink-0">{{ idx + 1 }}.</span>
                                    <UBadge :label="medium" variant="subtle" color="info" class="flex-1" />
                                    <div class="flex gap-1">
                                        <UButton icon="i-lucide-chevron-up"   size="xs" variant="ghost" color="neutral" :disabled="idx === 0" @click="movePreferredUp(idx)" />
                                        <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" color="neutral" :disabled="idx === form.preferred.length - 1" @click="movePreferredDown(idx)" />
                                        <UButton icon="i-lucide-trash-2"      size="xs" variant="ghost" color="error"   @click="removePreferred(idx)" />
                                    </div>
                                </div>
                                <p v-if="form.preferred.length === 0" class="text-xs text-muted py-1">
                                    {{ $t('alertsTemplate.noPreferred') }}
                                </p>
                            </div>
                        </div>
                    </UFormField>

                    <label v-if="isAlertAdmin()" class="flex items-center gap-3 cursor-pointer">
                        <USwitch v-model="form.global" />
                        <div class="flex flex-col">
                            <span class="text-sm font-medium">{{ $t('alertsTemplate.fieldGlobal') }}</span>
                            <span class="text-xs text-muted">{{ $t('alertsTemplate.fieldGlobalDesc') }}</span>
                        </div>
                    </label>
                </div>
            </UCard>

            <!-- ===== Section 2 – Parameters ===== -->
            <UCard variant="subtle">
                <template #header>
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex flex-col gap-0.5">
                            <span class="font-semibold">{{ $t('alertsTemplate.sectionParameters') }}</span>
                            <span class="text-xs text-muted">{{ $t('alertsTemplate.sectionParametersDesc') }}</span>
                        </div>
                        <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="soft" @click="addParameter()">
                            {{ $t('alertsTemplate.addParameter') }}
                        </UButton>
                    </div>
                </template>

                <div v-if="form.parameters.length === 0" class="text-sm text-muted text-center py-4">
                    {{ $t('alertsTemplate.noParameters') }}
                </div>
                <div v-else class="flex flex-col gap-2">
                    <div
                        v-for="(param, idx) in form.parameters"
                        :key="idx"
                        class="flex items-center gap-2 p-2 rounded-md bg-elevated/30"
                    >
                        <span class="text-xs text-muted font-mono w-6 text-right shrink-0">{{ '{' + (idx + 1) + '}' }}</span>

                        <USelectMenu
                            v-model="param.type"
                            value-key="value"
                            :items="paramTypeOptions"
                            class="flex-1 min-w-[10rem]"
                        />

                        <UInput
                            v-if="paramNeedsValue(param.type)"
                            v-model="param.param"
                            :placeholder="$t('alertsTemplate.paramValuePlaceholder')"
                            class="flex-1"
                        />
                        <span v-else class="flex-1" />

                        <div class="flex gap-1">
                            <UButton icon="i-lucide-chevron-up"   size="xs" variant="ghost" color="neutral" :disabled="idx === 0" @click="moveParameterUp(idx)" />
                            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" color="neutral" :disabled="idx === form.parameters.length - 1" @click="moveParameterDown(idx)" />
                            <UButton icon="i-lucide-trash-2"      size="xs" variant="ghost" color="error"   @click="removeParameter(idx)" />
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- ===== Section 3 – Open messages ===== -->
            <UCard variant="subtle">
                <template #header>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div class="flex flex-col gap-0.5 flex-1">
                            <span class="font-semibold">{{ $t('alertsTemplate.sectionOpen') }}</span>
                            <span class="text-xs text-muted">{{ $t('alertsTemplate.sectionOpenDesc') }}</span>
                        </div>
                        <div v-if="availableOpenLocales.length > 0" class="flex items-center gap-2 shrink-0">
                            <USelectMenu
                                v-model="newOpenLocale"
                                value-key="value"
                                :items="availableOpenLocales"
                                class="w-36"
                            />
                            <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="soft" @click="addOpenLocale()">
                                {{ $t('alertsTemplate.addLanguage') }}
                            </UButton>
                        </div>
                    </div>
                </template>

                <!-- Language tabs -->
                <template v-if="form.open.length > 0">
                    <UTabs
                        v-model="activeOpenLocale"
                        :items="openTabItems"
                        :content="false"
                        class="mb-4"
                    >
                        <template #trailing="{ item }">
                            <UIcon
                                name="i-lucide-x"
                                class="w-3 h-3 ml-1 cursor-pointer hover:text-error"
                                @click.stop="removeOpenLocale(form.open.findIndex(l => l.locale === item.value))"
                            />
                        </template>
                    </UTabs>

                    <!-- Active language content -->
                    <template v-if="activeOpenLocaleData">
                        <div class="flex flex-wrap gap-2 mb-3">
                            <UButton
                                v-for="opt in mediumOptions"
                                :key="opt.value"
                                size="sm"
                                :variant="activeOpenLocaleData.mediums.some(x => x.medium === opt.value) ? 'solid' : 'outline'"
                                color="neutral"
                                @click="toggleOpenMedium(opt.value as AlertMedium)"
                            >
                                {{ opt.label }}
                            </UButton>
                        </div>

                        <div v-if="activeOpenLocaleData.mediums.length === 0" class="text-sm text-muted text-center py-2">
                            {{ $t('alertsTemplate.noMedium') }}
                        </div>
                        <div v-else class="flex flex-col gap-3">
                            <div
                                v-for="(med, mIdx) in activeOpenLocaleData.mediums"
                                :key="med.medium"
                                class="flex flex-col gap-1.5 p-3 rounded-md bg-elevated/30"
                            >
                                <div class="flex items-center gap-2 flex-wrap">
                                    <UBadge :label="med.medium" variant="subtle" color="info" />
                                    <template v-if="form.parameters.length > 0">
                                        <UButton
                                            v-for="(_, pIdx) in form.parameters"
                                            :key="pIdx"
                                            size="xs"
                                            variant="soft"
                                            color="neutral"
                                            class="font-mono"
                                            @click="insertParam(activeOpenLocaleData.mediums, mIdx, 'open_' + activeOpenLocale + '_' + med.medium, '{' + (pIdx + 1) + '}')"
                                        >{{ '{' + (pIdx + 1) + '}' }}</UButton>
                                    </template>
                                    <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" class="ml-auto"
                                        @click="removeMediumFromLocale(form.open, activeOpenLocaleIdx, mIdx)"
                                    />
                                </div>
                                <UTextarea
                                    v-model="med.message"
                                    :placeholder="$t('alertsTemplate.mediumMessagePlaceholder')"
                                    :rows="3"
                                    class="w-full font-mono text-xs"
                                    @mouseup="saveMediumCursor('open_' + activeOpenLocale + '_' + med.medium, $event)"
                                    @keyup="saveMediumCursor('open_' + activeOpenLocale + '_' + med.medium, $event)"
                                    @blur="saveMediumCursor('open_' + activeOpenLocale + '_' + med.medium, $event)"
                                />
                            </div>
                        </div>
                    </template>
                </template>
                <div v-else class="text-sm text-muted text-center py-2">
                    {{ $t('alertsTemplate.noLanguage') }}
                </div>
            </UCard>

            <!-- ===== Section 4 – Close messages (conditional) ===== -->
            <UCard v-if="showClose" variant="subtle">
                <template #header>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div class="flex flex-col gap-0.5 flex-1">
                            <span class="font-semibold">{{ $t('alertsTemplate.sectionClose') }}</span>
                            <span class="text-xs text-muted">{{ $t('alertsTemplate.sectionCloseDesc') }}</span>
                        </div>
                        <div v-if="availableCloseLocales.length > 0" class="flex items-center gap-2 shrink-0">
                            <USelectMenu
                                v-model="newCloseLocale"
                                value-key="value"
                                :items="availableCloseLocales"
                                class="w-36"
                            />
                            <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="soft" @click="addCloseLocale()">
                                {{ $t('alertsTemplate.addLanguage') }}
                            </UButton>
                        </div>
                    </div>
                </template>

                <template v-if="form.close.length > 0">
                    <UTabs
                        v-model="activeCloseLocale"
                        :items="closeTabItems"
                        :content="false"
                        class="mb-4"
                    >
                        <template #trailing="{ item }">
                            <UIcon
                                name="i-lucide-x"
                                class="w-3 h-3 ml-1 cursor-pointer hover:text-error"
                                @click.stop="removeCloseLocale(form.close.findIndex(l => l.locale === item.value))"
                            />
                        </template>
                    </UTabs>

                    <template v-if="activeCloseLocaleData">
                        <div class="flex flex-wrap gap-2 mb-3">
                            <UButton
                                v-for="opt in mediumOptions"
                                :key="opt.value"
                                size="sm"
                                :variant="activeCloseLocaleData.mediums.some(x => x.medium === opt.value) ? 'solid' : 'outline'"
                                color="neutral"
                                @click="toggleCloseMedium(opt.value as AlertMedium)"
                            >
                                {{ opt.label }}
                            </UButton>
                        </div>

                        <div v-if="activeCloseLocaleData.mediums.length === 0" class="text-sm text-muted text-center py-2">
                            {{ $t('alertsTemplate.noMedium') }}
                        </div>
                        <div v-else class="flex flex-col gap-3">
                            <div
                                v-for="(med, mIdx) in activeCloseLocaleData.mediums"
                                :key="med.medium"
                                class="flex flex-col gap-1.5 p-3 rounded-md bg-elevated/30"
                            >
                                <div class="flex items-center gap-2 flex-wrap">
                                    <UBadge :label="med.medium" variant="subtle" color="warning" />
                                    <template v-if="form.parameters.length > 0">
                                        <UButton
                                            v-for="(_, pIdx) in form.parameters"
                                            :key="pIdx"
                                            size="xs"
                                            variant="soft"
                                            color="neutral"
                                            class="font-mono"
                                            @click="insertParam(activeCloseLocaleData.mediums, mIdx, 'close_' + activeCloseLocale + '_' + med.medium, '{' + (pIdx + 1) + '}')"
                                        >{{ '{' + (pIdx + 1) + '}' }}</UButton>
                                    </template>
                                    <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" class="ml-auto"
                                        @click="removeMediumFromLocale(form.close, activeCloseLocaleIdx, mIdx)"
                                    />
                                </div>
                                <UTextarea
                                    v-model="med.message"
                                    :placeholder="$t('alertsTemplate.mediumMessagePlaceholder')"
                                    :rows="3"
                                    class="w-full font-mono text-xs"
                                    @mouseup="saveMediumCursor('close_' + activeCloseLocale + '_' + med.medium, $event)"
                                    @keyup="saveMediumCursor('close_' + activeCloseLocale + '_' + med.medium, $event)"
                                    @blur="saveMediumCursor('close_' + activeCloseLocale + '_' + med.medium, $event)"
                                />
                            </div>
                        </div>
                    </template>
                </template>
                <div v-else class="text-sm text-muted text-center py-2">
                    {{ $t('alertsTemplate.noLanguage') }}
                </div>
            </UCard>

            <!-- ===== Save / Cancel ===== -->
            <div v-if="pageState.saveError" class="text-sm text-red-600 font-medium text-center">
                {{ pageState.saveError }}
            </div>

            <div class="flex items-center gap-4 justify-end">
                <UButton variant="ghost" color="neutral" :disabled="pageState.saving" @click="onCancel()">
                    {{ $t('alertsTemplate.cancel') }}
                </UButton>
                <UButton
                    icon="i-lucide-save"
                    color="primary"
                    :loading="pageState.saving"
                    @click="onSave()"
                >
                    {{ $t('alertsTemplate.save') }}
                </UButton>
            </div>

        </template>
    </div>
</template>
