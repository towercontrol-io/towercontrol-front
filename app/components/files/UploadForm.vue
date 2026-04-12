<script setup lang="ts">
    import type { FileAccessType, FileUploadResponseItf } from '~/types';

    const props = withDefaults(defineProps<{
        /** When set, locks accessType to this value and hides the selector */
        forcedAccessType?: FileAccessType;
        /** When true, locks withAccessKey to true and hides the toggle */
        forcedWithAccessKey?: boolean;
    }>(), {});

    const emit = defineEmits<{
        uploaded: [file: FileUploadResponseItf];
        cancelled: [];
    }>();

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();

    // Ticket-attachment mode: parent controls access params
    const isTicketMode = computed(() => props.forcedAccessType !== undefined);

    // --------------------------------------------------------------------
    // Form state
    // --------------------------------------------------------------------

    const formState = reactive({
        file: null as File | null,
        description: '' as string,
        accessType: (props.forcedAccessType ?? 'PRIVATE') as FileAccessType,
        withAccessKey: props.forcedWithAccessKey ?? false,
    });

    const isDragOver = ref(false);
    const fileInputRef = useTemplateRef('fileInputRef');
    const isUploading = ref(false);
    const uploadError = ref<string | null>(null);

    const accessTypeOptions = computed(() => [
        { label: t('files.accessPrivate'), value: 'PRIVATE' as FileAccessType },
        { label: t('files.accessConnected'), value: 'CONNECTED' as FileAccessType },
        { label: t('files.accessPublic'), value: 'PUBLIC' as FileAccessType },
    ]);

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // --------------------------------------------------------------------
    // File selection handlers
    // --------------------------------------------------------------------

    const onFileInputChange = (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            formState.file = input.files[0]!;
            uploadError.value = null;
        }
    };

    const onDrop = (event: DragEvent) => {
        isDragOver.value = false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            formState.file = files[0]!;
            uploadError.value = null;
        }
    };

    const clearFile = () => {
        formState.file = null;
        const input = fileInputRef.value as HTMLInputElement | null;
        if (input) input.value = '';
    };

    // --------------------------------------------------------------------
    // Submit / Cancel
    // --------------------------------------------------------------------

    const canSubmit = computed(() => !!formState.file && !isUploading.value);

    const onSubmit = async () => {
        if (!formState.file) return;
        uploadError.value = null;
        isUploading.value = true;
        try {
            const accessType = props.forcedAccessType ?? formState.accessType;
            const withAccessKey = props.forcedWithAccessKey ?? formState.withAccessKey;
            const res = await nuxtApp.$apiBackendFiles.filesModuleUpload(
                formState.file,
                accessType,
                formState.description || undefined,
                undefined,
                withAccessKey || undefined,
            );
            if (res.success) {
                if (isTicketMode.value) {
                    emit('uploaded', res.success);
                    clearFile();
                    formState.description = '';
                } else {
                    nuxtApp.callHook('filemng:uploaded' as any, res.success);
                    clearFile();
                    formState.description = '';
                    formState.accessType = 'PRIVATE';
                    formState.withAccessKey = false;
                }
            } else if (res.error) {
                uploadError.value = t('files.' + (res.error as any).message);
            }
        } catch {
            uploadError.value = t('common.unknownError');
        } finally {
            isUploading.value = false;
        }
    };

    const onCancel = () => {
        clearFile();
        formState.description = '';
        uploadError.value = null;
        if (isTicketMode.value) {
            emit('cancelled');
        } else {
            formState.accessType = 'PRIVATE';
            formState.withAccessKey = false;
            nuxtApp.callHook('filemng:close' as any);
        }
    };
</script>

<template>
    <div class="flex flex-col gap-5">

        <!-- Drop zone / file picker -->
        <div
            class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer select-none transition-colors"
            :class="isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-accented hover:border-primary/60'"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="onDrop"
            @click="(fileInputRef as HTMLInputElement | null)?.click()"
        >
            <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                @change="onFileInputChange"
            />

            <!-- No file selected -->
            <template v-if="!formState.file">
                <UIcon name="i-lucide-upload-cloud" class="w-10 h-10 mx-auto mb-2 text-muted" />
                <p class="text-sm text-muted">{{ t('files.uploadDropZone') }}</p>
            </template>

            <!-- File selected -->
            <template v-else>
                <div class="flex items-center justify-center gap-3">
                    <UIcon name="i-lucide-file-check" class="w-8 h-8 text-primary shrink-0" />
                    <div class="text-left min-w-0">
                        <p class="text-sm font-medium truncate max-w-xs">{{ formState.file.name }}</p>
                        <p class="text-xs text-muted">{{ formatSize(formState.file.size) }}</p>
                    </div>
                    <UButton
                        icon="i-lucide-x"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        @click.stop="clearFile()"
                    />
                </div>
            </template>
        </div>

        <!-- Description -->
        <UFormField :label="t('files.uploadDescription')">
            <UInput
                v-model="formState.description"
                :placeholder="t('files.uploadDescriptionPlaceholder')"
                class="w-full"
            />
        </UFormField>

        <!-- Access type (hidden in ticket-attachment mode) -->
        <UFormField v-if="!isTicketMode" :label="t('files.uploadAccessType')">
            <USelectMenu
                v-model="formState.accessType"
                value-key="value"
                :items="accessTypeOptions"
                class="w-52"
            />
        </UFormField>

        <!-- Access key (hidden in ticket-attachment mode) -->
        <UFormField v-if="!isTicketMode" :label="t('files.uploadWithAccessKey')" :description="t('files.uploadWithAccessKeyDesc')">
            <USwitch v-model="formState.withAccessKey" />
        </UFormField>

        <!-- Error message -->
        <div v-if="uploadError" class="text-sm text-red-600 font-medium">
            {{ uploadError }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-end">
            <UButton
                variant="ghost"
                color="neutral"
                :disabled="isUploading"
                @click="onCancel()"
            >
                {{ t('files.uploadCancel') }}
            </UButton>
            <UButton
                icon="i-lucide-upload"
                :loading="isUploading"
                :disabled="!canSubmit"
                color="primary"
                @click="onSubmit()"
            >
                {{ t('files.uploadSubmit') }}
            </UButton>
        </div>

    </div>
</template>
