<script setup lang="ts">
    import { reactive, ref, computed, onMounted } from 'vue';
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

    const fieldValues = reactive<Record<string, string>>({});
    const fieldValidity = reactive<Record<string, boolean>>({});
    const initialState = ref<IdStateEnum>(IdStateEnum.UNKNOWN);
    const submitting = ref(false);
    const errorMessage = ref<string | null>(null);

    const initialStateItems = computed(() => [
        { value: IdStateEnum.UNKNOWN, label: t('capture.idStateUnknown') },
        { value: IdStateEnum.NOT_ASSIGNED, label: t('capture.idStateNotAssigned') },
        { value: IdStateEnum.ASSIGNED, label: t('capture.idStateAssigned') },
        { value: IdStateEnum.IN_USE, label: t('capture.idStateInUse') },
    ]);

    const canSubmit = computed(() => {
        if (!selectedProtocolId.value?.mandatoryFields?.length) return false;
        return selectedProtocolId.value.mandatoryFields.every(f => fieldValidity[f.name] === true);
    });

    onMounted(() => {
        if (selectedProtocolId.value) {
            for (const f of selectedProtocolId.value.mandatoryFields) {
                fieldValues[f.name] = '';
                fieldValidity[f.name] = false;
            }
        }
    });

    const onSubmit = async () => {
        if (!selectedProtocolId.value || !canSubmit.value) return;
        submitting.value = true;
        errorMessage.value = null;

        const fields = selectedProtocolId.value.mandatoryFields;
        const headers = fields.map(f => f.name).join(';');
        const values = fields.map(f => fieldValues[f.name] ?? '').join(';');

        const body: CaptureInsertIdsBody = {
            captureId: props.endpoint.ref,
            initialState: initialState.value,
            headers,
            ids: [values],
        };

        try {
            const res = await nuxtApp.$apiBackendCapture.captureModuleInsertIds(body);
            if (res.success) {
                if (res.success.status === InsertIDsStatus.INSERTED) {
                    toast.add({
                        title: t('capture.insertIdSuccessTitle'),
                        description: t('capture.insertIdSuccessDesc'),
                        icon: 'i-lucide-check-circle',
                    });
                    emit('close');
                } else {
                    const key = 'insert-id-' + res.success.status.toLowerCase().replace(/_/g, '-');
                    errorMessage.value = t('capture.' + key);
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
            <CaptureMandatoryFieldInput
                v-for="field in selectedProtocolId.mandatoryFields"
                :key="field.name"
                :field="field"
                :model-value="fieldValues[field.name] ?? ''"
                @update:model-value="fieldValues[field.name] = $event"
                @update:valid="fieldValidity[field.name] = $event"
            />

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

            <div v-if="errorMessage" class="text-sm text-error">
                {{ errorMessage }}
            </div>

            <div class="flex justify-end gap-2">
                <UButton variant="soft" color="neutral" @click="emit('close')">
                    {{ t('capture.insertIdCancel') }}
                </UButton>
                <UButton
                    :disabled="!canSubmit || submitting"
                    :loading="submitting"
                    icon="i-lucide-key-round"
                    color="primary"
                    @click="onSubmit"
                >
                    {{ t('capture.insertIdSubmit') }}
                </UButton>
            </div>
        </template>
    </div>
</template>
