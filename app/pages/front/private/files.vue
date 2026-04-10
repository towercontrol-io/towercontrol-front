<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui';
    import type { FileUploadResponseItf } from '~/types';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'files' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const config = useRuntimeConfig();

    const UButton = resolveComponent('UButton');
    const UBadge  = resolveComponent('UBadge');
    const UIcon   = resolveComponent('UIcon');

    const componentCtx = reactive({
        filesLoading: false as boolean,
        filesLoadingError: null as string | null,
        files: [] as FileUploadResponseItf[],
        uploadMode: false as boolean,
        deleteConfirmLayer: false as boolean,
        fileToDelete: null as FileUploadResponseItf | null,
    });

    // Cache of authenticated blob URLs keyed by uniqueName
    const thumbnailBlobUrls = ref<Map<string, string>>(new Map());

    // Revoke all blob URLs to free memory
    const revokeThumbnails = () => {
        thumbnailBlobUrls.value.forEach(url => URL.revokeObjectURL(url));
        thumbnailBlobUrls.value.clear();
    };

    // Fetch thumbnails with JWT for every IMAGE file that has a thumbnail
    const loadThumbnails = async (files: FileUploadResponseItf[]) => {
        revokeThumbnails();
        const newMap = new Map<string, string>();
        await Promise.all(
            files
                .filter(f => f.mimeCategory === 'IMAGE' && f.thumbnailUniqueName)
                .map(async (f) => {
                    const fileRef = f.shortName || f.uniqueName;
                    const blob = await nuxtApp.$apiBackendFiles.filesModuleGetThumbnailBlob(fileRef);
                    if (blob) {
                        newMap.set(f.uniqueName, URL.createObjectURL(blob));
                    }
                })
        );
        thumbnailBlobUrls.value = newMap;
    };

    // --------------------------------------------------------------------
    // Load file list
    // --------------------------------------------------------------------

    const loadFiles = () => {
        componentCtx.filesLoading = true;
        componentCtx.filesLoadingError = null;
        nuxtApp.$apiBackendFiles.filesModuleListFiles().then((res) => {
            if (res.success) {
                componentCtx.files = res.success;
                loadThumbnails(res.success);
            } else if (res.error) {
                componentCtx.filesLoadingError = t('files.' + res.error.message);
            }
        }).catch(() => {
            componentCtx.filesLoadingError = t('common.unknownError');
        }).finally(() => {
            componentCtx.filesLoading = false;
        });
    };

    onMounted(() => {
        loadFiles();
    });

    onUnmounted(() => {
        revokeThumbnails();
    });

    // --------------------------------------------------------------------
    // Handle component signals
    // --------------------------------------------------------------------

    nuxtApp.hook('filemng:close' as any, () => {
        componentCtx.uploadMode = false;
    });

    nuxtApp.hook('filemng:uploaded' as any, () => {
        componentCtx.uploadMode = false;
        loadFiles();
    });

    // --------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    const formatDate = (ms: number): string => {
        return new Date(ms).toLocaleDateString();
    };

    const mimeCategoryIcon = (category: string): string => {
        switch (category) {
            case 'IMAGE': return 'i-lucide-image';
            case 'PDF':   return 'i-lucide-file-text';
            case 'TEXT':  return 'i-lucide-file-type-2';
            default:      return 'i-lucide-file';
        }
    };

    const mimeCategoryLabel = (category: string): string => {
        const cap = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        return t(`files.mime${cap}`);
    };

    const accessTypeColor = (accessType: string): string => {
        switch (accessType) {
            case 'PUBLIC':    return 'success';
            case 'CONNECTED': return 'warning';
            case 'PRIVATE':   return 'error';
            default:          return 'neutral';
        }
    };

    const accessTypeLabel = (accessType: string): string => {
        const cap = accessType.charAt(0).toUpperCase() + accessType.slice(1).toLowerCase();
        return t(`files.access${cap}`);
    };

    const getFileRef = (file: FileUploadResponseItf): string => {
        return file.shortName || file.uniqueName;
    };

    const getCachedThumbnailUrl = (file: FileUploadResponseItf): string | null => {
        if (file.mimeCategory !== 'IMAGE' || !file.thumbnailUniqueName) return null;
        return thumbnailBlobUrls.value.get(file.uniqueName) ?? null;
    };

    // --------------------------------------------------------------------
    // Actions (to be implemented)
    // --------------------------------------------------------------------

    const onEditFile = (_file: FileUploadResponseItf) => {
        // TODO: implement edit
    };

    const onDeleteFile = (file: FileUploadResponseItf) => {
        componentCtx.fileToDelete = file;
        componentCtx.deleteConfirmLayer = true;
    };

    const onConfirmDelete = () => {
        // TODO: implement delete API call
        componentCtx.deleteConfirmLayer = false;
        componentCtx.fileToDelete = null;
    };

    const onCancelDelete = () => {
        componentCtx.deleteConfirmLayer = false;
        componentCtx.fileToDelete = null;
    };

    // --------------------------------------------------------------------
    // Table column definitions
    // --------------------------------------------------------------------

    const tableDef = computed((): TableColumn<FileUploadResponseItf>[] => [
        {
            accessorKey: 'originalName',
            header: t('files.colName'),
            cell: ({ row }) => {
                const file = row.original;
                const thumb = getCachedThumbnailUrl(file);
                const icon = h(UIcon, { name: mimeCategoryIcon(file.mimeCategory), class: 'w-5 h-5 shrink-0 text-muted' });
                const preview = thumb
                    ? h('img', { src: thumb, class: 'w-8 h-8 object-cover rounded shrink-0', alt: file.originalName })
                    : icon;
                return h('div', { class: 'flex items-center gap-2' }, [
                    preview,
                    h('span', { class: 'truncate max-w-[14rem]' }, file.originalName)
                ]);
            }
        },
        {
            accessorKey: 'mimeCategory',
            header: t('files.colType'),
            cell: ({ row }) => {
                const cat = row.getValue('mimeCategory') as string;
                return h('div', { class: 'flex items-center gap-1' }, [
                    h(UIcon, { name: mimeCategoryIcon(cat), class: 'w-4 h-4 shrink-0' }),
                    h('span', {}, mimeCategoryLabel(cat))
                ]);
            }
        },
        {
            accessorKey: 'size',
            header: t('files.colSize'),
            cell: ({ row }) => formatSize(row.getValue('size') as number)
        },
        {
            accessorKey: 'accessType',
            header: t('files.colAccess'),
            cell: ({ row }) => {
                const access = row.getValue('accessType') as string;
                return h(UBadge, { label: accessTypeLabel(access), variant: 'subtle', color: accessTypeColor(access) });
            }
        },
        {
            accessorKey: 'createdAt',
            header: t('files.colDate'),
            cell: ({ row }) => formatDate(row.getValue('createdAt') as number)
        },
        {
            id: 'actions',
            header: t('files.colActions'),
            cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
                h(UButton, {
                    icon: 'i-lucide-pencil',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'info',
                    disabled: true,
                    'aria-label': t('files.actionEdit'),
                    onClick: () => onEditFile(row.original)
                }),
                h(UButton, {
                    icon: 'i-lucide-trash-2',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'error',
                    'aria-label': t('files.actionDelete'),
                    onClick: () => onDeleteFile(row.original)
                })
            ])
        }
    ]);
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">

        <UPageCard
            :title="$t('files.pageTitle')"
            :description="$t('files.pageDescription')"
            variant="naked"
            orientation="horizontal"
            class="mb-4"
        >
            <UButton
                :label="$t('files.uploadButton')"
                :disabled="componentCtx.uploadMode"
                icon="i-lucide-upload"
                color="neutral"
                class="w-fit lg:ms-auto"
                @click="componentCtx.uploadMode = true"
            />
        </UPageCard>

        <UCard
            v-if="componentCtx.uploadMode"
            class="w-full max-w-4xl mx-auto mb-4"
            variant="subtle"
        >
            <template #header>
                <span class="font-bold">{{ $t('files.uploadFormTitle') }}</span>
            </template>
            <template #default>
                <FilesUploadForm />
            </template>
        </UCard>

        <UCard
            class="w-full max-w-4xl mx-auto"
            variant="subtle"
        >
            <template #default>
                <div class="relative">
                    <UTable
                        :loading="componentCtx.filesLoading"
                        loading-color="primary"
                        loading-animation="carousel"
                        :data="componentCtx.files"
                        :columns="tableDef"
                        :empty="$t('files.listEmpty')"
                        sticky
                        class="flex-1 text-xs min-h-55"
                    />

                    <div v-if="componentCtx.filesLoadingError"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="mb-2 text-lg text-center text-red-600 font-bold">
                                {{ componentCtx.filesLoadingError }}
                            </div>
                        </div>
                    </div>

                    <div v-if="componentCtx.deleteConfirmLayer"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="mb-2 text-sm text-center">
                                {{ t('files.deleteConfirmDesc') }}
                            </div>
                            <div class="flex gap-4">
                                <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onConfirmDelete()">
                                    {{ t('files.deleteConfirm') }}
                                </UButton>
                                <UButton icon="i-lucide-circle-x" variant="soft" color="neutral" @click="onCancelDelete()">
                                    {{ t('files.deleteCancel') }}
                                </UButton>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </UCard>

    </div>
</template>
