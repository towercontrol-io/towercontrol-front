<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui';
    import type { FileUploadResponseItf, FileAccessType, FileAdminSortOrder } from '~/types';

    definePageMeta({ layout: 'main-layout', layoutProps: { title: 'filesAdmin' } });

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const config = useRuntimeConfig();

    const UButton = resolveComponent('UButton');
    const UBadge  = resolveComponent('UBadge');
    const UIcon   = resolveComponent('UIcon');

    // ---- Search / pagination state ----
    const searchQuery = ref('');
    const sortOrder   = ref<FileAdminSortOrder>('CREATED');
    const currentPage = ref(1); // 1-based (UPagination), converted to 0-based for the API
    const PAGE_SIZE   = 50;

    // ---- Inline-edit expansion state ----
    type EditDraft = {
        description: string;
        accessType: FileAccessType;
        withShortName: boolean;
        withAccessKey: boolean;
    };
    const expandedRows = ref<Record<string, boolean>>({});
    const editDrafts   = reactive<Record<string, EditDraft>>({});
    const editSaving   = reactive<Record<string, boolean>>({});
    const editErrors   = reactive<Record<string, string | null>>({});

    const accessTypeOptions = computed(() => [
        { label: t('files.accessPrivate'),   value: 'PRIVATE'   as FileAccessType },
        { label: t('files.accessConnected'), value: 'CONNECTED' as FileAccessType },
        { label: t('files.accessPublic'),    value: 'PUBLIC'    as FileAccessType },
    ]);

    const sortOptions = computed(() => [
        { label: t('files.adminSortCreated'), value: 'CREATED' as FileAdminSortOrder },
        { label: t('files.adminSortAccess'),  value: 'ACCESS'  as FileAdminSortOrder },
    ]);

    const componentCtx = reactive({
        loading: false as boolean,
        loadingError: null as string | null,
        files: [] as FileUploadResponseItf[],
        total: 0 as number,
        deleteConfirmLayer: false as boolean,
        fileToDelete: null as FileUploadResponseItf | null,
    });

    // ---- Authenticated thumbnail blob cache ----
    const thumbnailBlobUrls = ref<Map<string, string>>(new Map());

    const revokeThumbnails = () => {
        thumbnailBlobUrls.value.forEach(url => URL.revokeObjectURL(url));
        thumbnailBlobUrls.value.clear();
    };

    const loadThumbnails = async (files: FileUploadResponseItf[]) => {
        revokeThumbnails();
        const newMap = new Map<string, string>();
        await Promise.all(
            files
                .filter(f => f.mimeCategory === 'IMAGE' && f.thumbnailUniqueName)
                .map(async (f) => {
                    const fileRef = f.shortName || f.uniqueName;
                    const blob = await nuxtApp.$apiBackendFiles.filesModuleGetThumbnailBlob(fileRef);
                    if (blob) newMap.set(f.uniqueName, URL.createObjectURL(blob));
                })
        );
        thumbnailBlobUrls.value = newMap;
    };

    // -----------------------------------------------------------------------
    // Load
    // -----------------------------------------------------------------------
    const loadFiles = async () => {
        expandedRows.value = {};
        componentCtx.loading = true;
        componentCtx.loadingError = null;
        const res = await nuxtApp.$apiBackendFiles.filesAdminList({
            page: currentPage.value - 1,
            size: PAGE_SIZE,
            sort: sortOrder.value,
            search: searchQuery.value.trim() || undefined,
        });
        if (res.success) {
            componentCtx.files = res.success.files;
            componentCtx.total = res.success.total;
            loadThumbnails(res.success.files);
        } else {
            componentCtx.loadingError = t('files.' + ((res.error as any)?.message ?? 'unknownError'));
        }
        componentCtx.loading = false;
    };

    onMounted(loadFiles);
    onUnmounted(revokeThumbnails);

    // Reload when page changes
    watch(currentPage, loadFiles);

    // Search: debounced, reset to page 1
    let searchDebounce: ReturnType<typeof setTimeout>;
    watch(searchQuery, () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            if (currentPage.value !== 1) { currentPage.value = 1; } // watch will fire loadFiles
            else { loadFiles(); }
        }, 350);
    });

    // Sort: instant, reset to page 1
    watch(sortOrder, () => {
        if (currentPage.value !== 1) { currentPage.value = 1; }
        else { loadFiles(); }
    });

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    const formatDate = (ms: number) => new Date(ms).toLocaleDateString();

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

    const getFileRef = (file: FileUploadResponseItf) => file.shortName || file.uniqueName;

    const getFileUrl = (file: FileUploadResponseItf): string => {
        const base = `${config.public.BACKEND_API_BASE}/files/1.0/${getFileRef(file)}/full`;
        return file.accessKey ? `${base}?key=${file.accessKey}` : base;
    };

    const getCachedThumbnailUrl = (file: FileUploadResponseItf): string | null => {
        if (file.mimeCategory !== 'IMAGE' || !file.thumbnailUniqueName) return null;
        return thumbnailBlobUrls.value.get(file.uniqueName) ?? null;
    };

    const getDraft = (key: string): EditDraft => editDrafts[key] as EditDraft;

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    const onEditFile = (file: FileUploadResponseItf) => {
        const key = file.uniqueName;
        if (expandedRows.value[key]) {
            expandedRows.value = {};
            delete editDrafts[key];
            delete editErrors[key];
            return;
        }
        expandedRows.value = {};
        editDrafts[key] = {
            description: file.description ?? '',
            accessType: (file.accessType as FileAccessType) ?? 'PRIVATE',
            withShortName: !!file.shortName,
            withAccessKey: !!file.accessKey,
        };
        editErrors[key] = null;
        expandedRows.value = { [key]: true };
    };

    const onCancelEdit = (file: FileUploadResponseItf) => {
        expandedRows.value = {};
        delete editDrafts[file.uniqueName];
        delete editErrors[file.uniqueName];
    };

    const onSaveEdit = async (file: FileUploadResponseItf) => {
        const key = file.uniqueName;
        const draft = editDrafts[key];
        if (!draft) return;
        editSaving[key] = true;
        editErrors[key] = null;
        const res = await nuxtApp.$apiBackendFiles.filesAdminUpdate(getFileRef(file), {
            accessType: draft.accessType,
            description: draft.description || undefined,
            withShortName: draft.withShortName,
            withAccessKey: draft.withAccessKey,
        });
        if (res.success) {
            const idx = componentCtx.files.findIndex(f => f.uniqueName === key);
            if (idx !== -1) componentCtx.files[idx] = res.success!;
            expandedRows.value = {};
            delete editDrafts[key];
            delete editErrors[key];
        } else {
            editErrors[key] = t('files.' + ((res.error as any)?.message ?? 'unknownError'));
        }
        editSaving[key] = false;
    };

    const onDeleteFile = (file: FileUploadResponseItf) => {
        componentCtx.fileToDelete = file;
        componentCtx.deleteConfirmLayer = true;
    };

    const onConfirmDelete = async () => {
        if (!componentCtx.fileToDelete) return;
        const file = componentCtx.fileToDelete;
        const res = await nuxtApp.$apiBackendFiles.filesAdminDelete(getFileRef(file));
        if (res.success) {
            componentCtx.files = componentCtx.files.filter(f => f.uniqueName !== file.uniqueName);
            componentCtx.total = Math.max(0, componentCtx.total - 1);
            if (componentCtx.files.length === 0 && currentPage.value > 1) {
                currentPage.value--; // triggers reload via watcher
            }
        } else {
            componentCtx.loadingError = t('files.' + ((res.error as any)?.message ?? 'unknownError'));
        }
        componentCtx.deleteConfirmLayer = false;
        componentCtx.fileToDelete = null;
    };

    const onCancelDelete = () => {
        componentCtx.deleteConfirmLayer = false;
        componentCtx.fileToDelete = null;
    };

    const onCopyLink = (file: FileUploadResponseItf) => {
        if (!file.accessKey && file.accessType !== 'PUBLIC') return;
        navigator.clipboard.writeText(getFileUrl(file));
        const toast = useToast();
        toast.add({ title: t('files.linkCopied'), icon: 'i-lucide-clipboard-check', color: 'success', duration: 3000 });
    };

    // -----------------------------------------------------------------------
    // Table columns
    // -----------------------------------------------------------------------
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
                const label = (file.description && file.description.length > 3) ? file.description : file.originalName;
                return h('div', { class: 'flex items-center gap-2' }, [
                    preview,
                    h('span', { class: 'truncate max-w-[12rem]' }, label),
                ]);
            }
        },
        {
            accessorKey: 'ownerId',
            header: t('files.colOwner'),
            cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted truncate max-w-[10rem] block' }, row.original.ownerId)
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
            accessorKey: 'accessCount',
            header: t('files.colAccessCount'),
            cell: ({ row }) => String(row.getValue('accessCount') as number)
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
                    icon: 'i-lucide-link',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'neutral',
                    disabled: !row.original.accessKey && row.original.accessType !== 'PUBLIC',
                    'aria-label': t('files.actionCopyLink'),
                    onClick: () => onCopyLink(row.original)
                }),
                h(UButton, {
                    icon: 'i-lucide-pencil',
                    size: 'xs',
                    variant: 'ghost',
                    color: 'neutral',
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
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-6xl mx-auto mb-4">

        <UPageCard
            :title="$t('files.adminPageTitle')"
            :description="$t('files.adminPageDescription')"
            variant="naked"
            orientation="horizontal"
            class="mb-2"
        />

        <!-- Search / sort toolbar -->
        <div class="flex flex-wrap gap-3 items-center">
            <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                :placeholder="$t('files.adminSearchPlaceholder')"
                class="flex-1 min-w-[14rem]"
            />
            <USelectMenu
                v-model="sortOrder"
                value-key="value"
                :items="sortOptions"
                class="w-48"
            />
        </div>

        <UCard class="w-full max-w-6xl mx-auto" variant="subtle">
            <template #default>
                <div class="relative">
                    <UTable
                        v-model:expanded="expandedRows"
                        :get-row-id="(row) => row.uniqueName"
                        :loading="componentCtx.loading"
                        loading-color="primary"
                        loading-animation="carousel"
                        :data="componentCtx.files"
                        :columns="tableDef"
                        :empty="$t('files.adminListEmpty')"
                        sticky
                        class="flex-1 text-xs min-h-55"
                    >
                        <template #expanded="{ row }">
                            <div v-if="editDrafts[row.original.uniqueName]" class="px-4 py-3 flex flex-col gap-4 bg-elevated/30">
                                <UFormField :label="t('files.editFileName')">
                                    <UInput :model-value="row.original.originalName" disabled class="w-full font-mono text-xs" />
                                </UFormField>
                                <UFormField :label="t('files.editFileLink')">
                                    <div class="flex items-center gap-2">
                                        <UInput :model-value="getFileUrl(row.original)" disabled class="flex-1 font-mono text-xs" />
                                        <UButton
                                            icon="i-lucide-clipboard"
                                            size="xs"
                                            variant="ghost"
                                            color="neutral"
                                            :disabled="!row.original.accessKey && row.original.accessType !== 'PUBLIC'"
                                            :aria-label="t('files.actionCopyLink')"
                                            @click="onCopyLink(row.original)"
                                        />
                                    </div>
                                </UFormField>
                                <div class="flex gap-4 flex-wrap items-end">
                                    <UFormField :label="t('files.editDescription')" class="flex-1 min-w-[12rem]">
                                        <UInput
                                            v-model="getDraft(row.original.uniqueName).description"
                                            :placeholder="t('files.editDescriptionPlaceholder')"
                                            class="w-full"
                                        />
                                    </UFormField>
                                    <UFormField :label="t('files.editAccessType')">
                                        <USelectMenu
                                            v-model="getDraft(row.original.uniqueName).accessType"
                                            value-key="value"
                                            :items="accessTypeOptions"
                                            class="w-44"
                                        />
                                    </UFormField>
                                </div>
                                <div class="flex gap-6 flex-wrap">
                                    <label class="flex items-center gap-3 cursor-pointer">
                                        <USwitch v-model="getDraft(row.original.uniqueName).withShortName" />
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium">{{ t('files.editWithShortName') }}</span>
                                            <span class="text-xs text-muted">{{ t('files.editWithShortNameDesc') }}</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer">
                                        <USwitch v-model="getDraft(row.original.uniqueName).withAccessKey" />
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium">{{ t('files.editWithAccessKey') }}</span>
                                            <span class="text-xs text-muted">{{ t('files.editWithAccessKeyDesc') }}</span>
                                        </div>
                                    </label>
                                </div>
                                <div v-if="editErrors[row.original.uniqueName]" class="text-sm text-red-600 font-medium">
                                    {{ editErrors[row.original.uniqueName] }}
                                </div>
                                <div class="flex gap-3 justify-end">
                                    <UButton
                                        variant="ghost"
                                        color="neutral"
                                        :disabled="editSaving[row.original.uniqueName]"
                                        @click="onCancelEdit(row.original)"
                                    >
                                        {{ t('files.editCancel') }}
                                    </UButton>
                                    <UButton
                                        icon="i-lucide-save"
                                        :loading="editSaving[row.original.uniqueName]"
                                        color="primary"
                                        @click="onSaveEdit(row.original)"
                                    >
                                        {{ t('files.editSave') }}
                                    </UButton>
                                </div>
                            </div>
                        </template>
                    </UTable>

                    <!-- Error overlay -->
                    <div v-if="componentCtx.loadingError"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="mb-2 text-lg text-center text-red-600 font-bold">
                                {{ componentCtx.loadingError }}
                            </div>
                            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="loadFiles()">
                                {{ $t('files.deleteCancel') }}
                            </UButton>
                        </div>
                    </div>

                    <!-- Delete confirmation overlay -->
                    <div v-if="componentCtx.deleteConfirmLayer"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="mb-2 text-sm text-center">
                                {{ t('files.adminDeleteConfirmDesc') }}
                            </div>
                            <div v-if="componentCtx.fileToDelete" class="font-mono text-xs text-muted">
                                {{ componentCtx.fileToDelete.originalName }}
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

            <template #footer>
                <div class="flex items-center justify-between gap-4 flex-wrap">
                    <span class="text-xs text-muted">
                        {{ t('files.adminPaginationInfo', { total: componentCtx.total }) }}
                    </span>
                    <UPagination
                        v-model:page="currentPage"
                        :total="componentCtx.total"
                        :items-per-page="PAGE_SIZE"
                        size="xs"
                    />
                </div>
            </template>
        </UCard>

    </div>
</template>
