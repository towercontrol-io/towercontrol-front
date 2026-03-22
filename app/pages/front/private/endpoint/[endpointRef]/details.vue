<script setup lang="ts">
    import { reactive, ref, computed } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import type { CaptureProtocolResponseItf, CaptureEndpointResponseItf } from '~/types';

    definePageMeta({ layout: 'main-layout', layoutProps: { title: 'endpointDetails' } });

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const route = useRoute();
    const router = useRouter();

    const endpointRef = route.params.endpointRef as string;

    const componentCtx = reactive({
        loading: false as boolean,
        loadError: null as string | null,
        endpoint: null as CaptureEndpointResponseItf | null,
        protocolList: [] as CaptureProtocolResponseItf[],
    });

    const showSingleIdForm = ref(false);
    const showBulkIdForm = ref(false);

    const toggleSingleIdForm = () => {
        showSingleIdForm.value = !showSingleIdForm.value;
        if (showSingleIdForm.value) showBulkIdForm.value = false;
    };

    const toggleBulkIdForm = () => {
        showBulkIdForm.value = !showBulkIdForm.value;
        if (showBulkIdForm.value) showSingleIdForm.value = false;
    };

    const protocol = computed((): CaptureProtocolResponseItf | null => {
        if (!componentCtx.endpoint || !componentCtx.protocolList.length) return null;
        return componentCtx.protocolList.find(p => p.id === componentCtx.endpoint!.protocolId) ?? null;
    });

    const selectedProtocolId = computed(() => {
        if (!protocol.value || !componentCtx.endpoint?.idTypeName) return null;
        return protocol.value.protocolIds?.find(pid => pid.name === componentCtx.endpoint!.idTypeName) ?? null;
    });

    const getCustomConfigValue = (name: string): string => {
        return componentCtx.endpoint?.customConfig?.find(f => f.name === name)?.value ?? '—';
    };

    const loadData = async () => {
        componentCtx.loading = true;
        componentCtx.loadError = null;

        const [protocolRes, endpointRes] = await Promise.allSettled([
            nuxtApp.$apiBackendCapture.captureModuleGetProtocols(),
            nuxtApp.$apiBackendCapture.captureModuleGetEndpointByRef(endpointRef),
        ]);

        if (protocolRes.status === 'fulfilled' && protocolRes.value.success) {
            componentCtx.protocolList = protocolRes.value.success as CaptureProtocolResponseItf[];
        }

        if (endpointRes.status === 'fulfilled' && endpointRes.value.success) {
            componentCtx.endpoint = endpointRes.value.success;
        } else {
            componentCtx.loadError = t('capture.errorLoadingEndpoints');
        }

        componentCtx.loading = false;
    };

    onMounted(() => {
        loadData();
    });
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">

        <!-- Header -->
        <UPageCard
            :title="$t('capture.endpointDetailsTitle')"
            :description="$t('capture.endpointDetailsDesc')"
            variant="naked"
            orientation="horizontal"
            class="mb-4"
        >
            <UButton
                :label="$t('capture.endpointDetailsBack')"
                icon="i-lucide-arrow-left"
                color="neutral"
                variant="soft"
                class="w-fit lg:ms-auto"
                @click="router.push('/front/private/endpoints')"
            />
        </UPageCard>

        <!-- Loading -->
        <div v-if="componentCtx.loading" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
        </div>

        <!-- Error -->
        <div v-else-if="componentCtx.loadError" class="flex justify-center py-8">
            <span class="text-error text-sm">{{ componentCtx.loadError }}</span>
        </div>

        <template v-else-if="componentCtx.endpoint">

            <!-- Endpoint general info -->
            <UCard class="w-full max-w-4xl mx-auto" variant="subtle">
                <template #header>
                    <span class="font-bold">{{ t('capture.endpointInfoSection') }}</span>
                </template>
                <template #default>
                    <div class="flex flex-col gap-3 text-sm">
                        <div class="flex justify-between items-start gap-4">
                            <span class="text-neutral-500">{{ t('capture.nameCol') }}</span>
                            <span class="font-medium">{{ componentCtx.endpoint.name }}</span>
                        </div>
                        <div class="flex justify-between items-start gap-4">
                            <span class="text-neutral-500">{{ t('capture.refCol') }}</span>
                            <span class="font-mono">{{ componentCtx.endpoint.ref }}</span>
                        </div>
                        <div class="flex justify-between items-start gap-4">
                            <span class="text-neutral-500">{{ t('capture.descCol') }}</span>
                            <span class="max-w-xs text-right">{{ componentCtx.endpoint.description }}</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <span class="text-neutral-500">{{ t('capture.wideCol') }}</span>
                            <UCheckbox :model-value="componentCtx.endpoint.wideOpen" disabled color="neutral" />
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <span class="text-neutral-500">{{ t('capture.encryptCol') }}</span>
                            <UCheckbox :model-value="componentCtx.endpoint.encrypted" disabled color="neutral" />
                        </div>

                        <template v-if="protocol">
                            <USeparator class="my-1" />
                            <div class="flex justify-between items-start gap-4">
                                <span class="text-neutral-500">{{ t('capture.endpProtocolFamily') }}</span>
                                <span>{{ t('capture.' + protocol.protocolFamily) }}</span>
                            </div>
                            <div class="flex justify-between items-start gap-4">
                                <span class="text-neutral-500">{{ t('capture.endpProtocolType') }}</span>
                                <span>{{ t('capture.' + protocol.protocolType) }}</span>
                            </div>
                            <div class="flex justify-between items-start gap-4">
                                <span class="text-neutral-500">{{ t('capture.endpProtocolVersion') }}</span>
                                <span>{{ t('capture.' + protocol.protocolVersion) }}</span>
                            </div>
                        </template>
                    </div>
                </template>
            </UCard>

            <!-- Protocol mandatory fields -->
            <UCard v-if="protocol?.mandatoryFields?.length" class="w-full max-w-4xl mx-auto" variant="subtle">
                <template #header>
                    <span class="font-bold">{{ t('capture.endpConfigSection') }}</span>
                </template>
                <template #default>
                    <div class="flex flex-col gap-3">
                        <div
                            v-for="field in protocol.mandatoryFields"
                            :key="field.name"
                            class="flex justify-between items-start gap-4"
                        >
                            <div class="flex flex-col">
                                <span class="text-sm font-medium">{{ t('capture.' + field.description) }}</span>
                                <span class="text-xs text-neutral-500">{{ field.enDescription }}</span>
                            </div>
                            <span class="text-sm font-mono text-right max-w-xs break-all">{{ getCustomConfigValue(field.name) }}</span>
                        </div>
                    </div>
                </template>
            </UCard>

            <!-- ID type info & its mandatory fields -->
            <UCard v-if="selectedProtocolId" class="w-full max-w-4xl mx-auto" variant="subtle">
                <template #header>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold">{{ t('capture.endpIdTypeSection') }}</span>
                        <div class="flex items-center gap-1">
                            <UTooltip :text="t('capture.insertSingleIdTitle')">
                                <UButton
                                    icon="i-lucide-key-round"
                                    variant="ghost"
                                    :color="showSingleIdForm ? 'primary' : 'neutral'"
                                    size="sm"
                                    @click="toggleSingleIdForm"
                                />
                            </UTooltip>
                            <UTooltip :text="t('capture.insertBulkIdTitle')">
                                <UButton
                                    icon="i-lucide-book-key"
                                    variant="ghost"
                                    :color="showBulkIdForm ? 'primary' : 'neutral'"
                                    size="sm"
                                    @click="toggleBulkIdForm"
                                />
                            </UTooltip>
                        </div>
                    </div>
                </template>
                <template #default>
                    <div class="flex flex-col gap-3 text-sm">
                        <div class="flex justify-between items-start gap-4">
                            <span class="text-neutral-500">{{ t('capture.endpProtocolIdType') }}</span>
                            <span class="font-medium">{{ t('capture.' + selectedProtocolId.description) }}</span>
                        </div>

                        <template v-if="selectedProtocolId.mandatoryFields?.length">
                            <USeparator class="my-1" />
                            <span class="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                                {{ t('capture.endpIdTypeMandatoryFields') }}
                            </span>
                            <div
                                v-for="field in selectedProtocolId.mandatoryFields"
                                :key="field.name"
                                class="flex justify-between items-center gap-4 px-2 py-1.5 rounded bg-neutral-50/50"
                            >
                                <div class="flex flex-col">
                                    <span class="font-medium">{{ t('capture.' + field.name) }}</span>
                                    <span class="text-xs text-neutral-500">{{ t('capture.' + field.description) }}</span>
                                </div>
                                <UBadge color="neutral" variant="soft" size="xs">{{ field.valueType }}</UBadge>
                            </div>
                        </template>
                    </div>
                </template>
            </UCard>

        </template>

        <!-- ID insertion inline forms -->
        <template v-if="protocol && componentCtx.endpoint && selectedProtocolId">
            <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <UCard v-if="showSingleIdForm" class="w-full max-w-4xl mx-auto" variant="subtle">
                    <template #header>
                        <div class="flex items-center justify-between w-full">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-lucide-key-round" class="w-4 h-4 text-neutral" />
                                <span class="font-bold">{{ t('capture.insertSingleIdTitle') }}</span>
                            </div>
                            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="showSingleIdForm = false" />
                        </div>
                    </template>
                    <template #default>
                        <CaptureSingleIdInsertForm
                            :protocol="protocol"
                            :endpoint="componentCtx.endpoint"
                            @close="showSingleIdForm = false"
                        />
                    </template>
                </UCard>
            </Transition>

            <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <UCard v-if="showBulkIdForm" class="w-full max-w-4xl mx-auto" variant="subtle">
                    <template #header>
                        <div class="flex items-center justify-between w-full">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-lucide-book-key" class="w-4 h-4 text-primary" />
                                <span class="font-bold">{{ t('capture.insertBulkIdTitle') }}</span>
                            </div>
                            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="showBulkIdForm = false" />
                        </div>
                    </template>
                    <template #default>
                        <CaptureBulkIdInsertForm
                            :protocol="protocol"
                            :endpoint="componentCtx.endpoint"
                            @close="showBulkIdForm = false"
                        />
                    </template>
                </UCard>
            </Transition>
        </template>

    </div>
</template>
