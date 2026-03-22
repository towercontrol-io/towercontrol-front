<script setup lang="ts">
    import { ref, computed } from 'vue';
    import type { CaptureProtocolResponseItf, CaptureEndpointResponseItf, CaptureInsertIdsBody } from '~/types';
    import { IdStateEnum, InsertIDsStatus } from '~/types';

    const props = defineProps<{
        protocol: CaptureProtocolResponseItf;
        endpoint: CaptureEndpointResponseItf;
    }>();

    const emit = defineEmits<{
        (e: 'close'): void;
    }>();

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const toast = useToast();

    const selectedProtocolId = computed(() => {
        return props.protocol.protocolIds?.find(pid => pid.name === props.endpoint.idTypeName) ?? null;
    });

    const bulkText = ref('');
    const initialState = ref<IdStateEnum>(IdStateEnum.UNKNOWN);
    const submitting = ref(false);
    const errorMessage = ref<string | null>(null);
    const errorFirstLine = ref(0);
    const errorCount = ref(0);

    const initialStateItems = computed(() => [
        { value: IdStateEnum.UNKNOWN, label: t('capture.idStateUnknown') },
        { value: IdStateEnum.NOT_ASSIGNED, label: t('capture.idStateNotAssigned') },
        { value: IdStateEnum.ASSIGNED, label: t('capture.idStateAssigned') },
        { value: IdStateEnum.IN_USE, label: t('capture.idStateInUse') },
    ]);

    const expectedHeadersDisplay = computed(() => {
        return selectedProtocolId.value?.mandatoryFields.map(f => f.name).join(' ; ') ?? '';
    });

    const parsedLines = computed(() => {
        return bulkText.value
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);
    });

    const canSubmit = computed(() => {
        return parsedLines.value.length > 0 && !!selectedProtocolId.value;
    });

    const onSubmit = async () => {
        if (!selectedProtocolId.value || !canSubmit.value) return;
        submitting.value = true;
        errorMessage.value = null;
        errorFirstLine.value = 0;
        errorCount.value = 0;

        const headers = selectedProtocolId.value.mandatoryFields.map(f => f.name).join(';');

        const body: CaptureInsertIdsBody = {
            captureId: props.endpoint.ref,
            initialState: initialState.value,
            headers,
            ids: parsedLines.value,
        };

        try {
            const res = await nuxtApp.$apiBackendCapture.captureModuleInsertIds(body);
            if (res.success) {
                if (res.success.status === InsertIDsStatus.INSERTED) {
                    toast.add({
                        title: t('capture.insertBulkIdSuccessTitle'),
                        description: t('capture.insertBulkIdSuccessDesc', { count: res.success.inserted }),
                        icon: 'i-lucide-check-circle',
                    });
                    emit('close');
                } else {
                    const key = 'insert-id-' + res.success.status.toLowerCase().replace(/_/g, '-');
                    errorMessage.value = t('capture.' + key);
                    errorFirstLine.value = res.success.errorFirstLine ?? 0;
                    errorCount.value = res.success.errorCount ?? 0;
                }
            } else if (res.error) {
                const errMsg = (res.error as any).message ?? 'unknownError';
                errorMessage.value = t('capture.' + errMsg);
            }
        } finally {
            submitting.value = false;
        }
    };
</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-if="!selectedProtocolId" class="text-sm text-error">
            {{ t('capture.insertIdNoProtocol') }}
        </div>
        <template v-else>
            <div class="text-sm text-neutral-500">
                <span class="font-medium">{{ t('capture.insertIdBulkHeaders') }} :</span>
                <span class="font-mono ml-1">{{ expectedHeadersDisplay }}</span>
            </div>

            <UFormField
                name="bulkContent"
                :label="t('capture.insertIdBulkContent')"
                :description="t('capture.insertIdBulkContentDesc')"
                class="flex flex-col gap-2"
            >
                <UTextarea
                    v-model="bulkText"
                    :rows="8"
                    :placeholder="expectedHeadersDisplay.replace(/ ; /g, ';') + '\n...'"
                    class="font-mono text-xs w-full"
                />
            </UFormField>

            <div class="text-xs text-neutral-400">
                {{ t('capture.insertIdBulkLineCount', { count: parsedLines.length }) }}
            </div>

            <UFormField
                name="initialState"
                :label="t('capture.insertIdInitialState')"
                :description="t('capture.insertIdInitialStateDesc')"
                class="flex max-sm:flex-col justify-between items-start gap-4"
            >
                <USelectMenu
                    v-model="initialState"
                    :items="initialStateItems"
                    value-key="value"
                    label-key="label"
                    class="w-70"
                />
            </UFormField>

            <div v-if="errorMessage" class="rounded-lg border border-error/40 bg-error/5 p-4 flex flex-col gap-3 text-error">
                <div class="flex items-center gap-2 font-semibold text-sm">
                    <UIcon name="i-lucide-alert-circle" class="shrink-0 size-4" />
                    {{ errorMessage }}
                </div>
                <div v-if="errorFirstLine > 0" class="flex flex-col gap-1 text-xs">
                    <span class="font-medium">{{ t('capture.insertIdErrorAtLine', { line: errorFirstLine }) }}</span>
                    <code v-if="parsedLines[errorFirstLine - 1]" class="font-mono bg-error/10 rounded px-2 py-1 break-all">
                        {{ parsedLines[errorFirstLine - 1] }}
                    </code>
                </div>
                <div v-if="errorCount > 0" class="text-xs font-medium">
                    {{ t('capture.insertIdErrorCount', { count: errorCount }) }}
                </div>
            </div>

            <div class="flex justify-end gap-2">
                <UButton variant="soft" color="neutral" @click="emit('close')">
                    {{ t('capture.insertIdCancel') }}
                </UButton>
                <UButton
                    :disabled="!canSubmit || submitting"
                    :loading="submitting"
                    icon="i-lucide-book-key"
                    color="primary"
                    @click="onSubmit"
                >
                    {{ t('capture.insertBulkIdSubmit') }}
                </UButton>
            </div>
        </template>
    </div>
</template>
