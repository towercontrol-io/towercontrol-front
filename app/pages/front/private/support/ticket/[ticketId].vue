<script setup lang="ts">
    import { useRoute } from 'vue-router';
    import { computed, reactive, ref, watch } from 'vue';
    import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui';
    import { TextAlign } from '@tiptap/extension-text-align';
    import type {
        PrivTicketSupportResponseItf,
        PrivTicketSupportManagersResponseItf,
        PrivTicketPriority,
        PrivTicketStatus,
        PrivTicketUpdateBody,
        PrivTicketUpdateMessageBody,
        PrivTicketUserMessageBody
    } from '~/types';
    import type { FileUploadResponseItf, FileUpdateBody, FileAccessType } from '~/types';

    definePageMeta({ layout: 'main-layout', layoutProps: { title: 'ticketAdvEdition' } });

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const toast = useToast();
    const config = useRuntimeConfig();
    const { $formatDuration } = useNuxtApp();
    const route = useRoute();

    const componentCtx = reactive({
        ticketLoading: false as boolean,
        ticketLoadingError: null as string | null,
        ticketId: '' as string,
        ticket: {} as PrivTicketSupportResponseItf,
        ticketBackup: null as PrivTicketSupportResponseItf | null,
        ticketSaving: false as boolean,
        submitError: null as string | null,
        messageEdit: {} as Record<string, boolean>,
        messageBackup: {} as Record<string, { content: string; llmDescription: string }>,
        response: {} as PrivTicketUserMessageBody,
        responseFormState: {} as any,
        aiLoading: false as boolean
    });

    const assigneeOptions = ref<{ login: string; fullName?: string }[]>([]);

    const statusOptions = computed(() => [
        { value: 'OPEN' as PrivTicketStatus, label: t('tickets.statusOpen') },
        { value: 'RESP_PENDING' as PrivTicketStatus, label: t('tickets.statusResponsePending') },
        { value: 'CLOSED' as PrivTicketStatus, label: t('tickets.statusClosed') },
        { value: 'CLOSED_KB' as PrivTicketStatus, label: t('tickets.statusClosedKb') }
    ]);

    const priorityOptions = computed(() => [
        { value: 'LOW' as PrivTicketPriority, label: t('tickets.priorityLow') },
        { value: 'MEDIUM' as PrivTicketPriority, label: t('tickets.priorityMedium') },
        { value: 'HIGH' as PrivTicketPriority, label: t('tickets.priorityHigh') },
        { value: 'URGENT' as PrivTicketPriority, label: t('tickets.priorityUrgent') }
    ]);

    const assigneeItems = computed(() => {
        const mapped = assigneeOptions.value.map((item) => ({
            value: item.login,
            label: item.fullName && item.fullName.trim().length > 0 ? item.fullName : item.login
        }));
        return [{ value: null, label: t('tickets.assignUnassigned') }, ...mapped];
    });

    const assigneeSelection = computed({
        get: () => (componentCtx.ticket.assignedToLogin ? componentCtx.ticket.assignedToLogin : null),
        set: (value) => {
            componentCtx.ticket.assignedToLogin = value ?? '';
        }
    });

    const ticketCreatedAgo = computed(() => {
        if (!componentCtx.ticket?.creationMs) {
            return '';
        }
        return $formatDuration((Date.now() - componentCtx.ticket.creationMs) / 1000);
    });

    const ticketOwnerLabel = computed(() => {
        const owner = componentCtx.ticket?.owner;
        if (!owner || owner.trim().length === 0) {
            return t('tickets.ticketOwnerUnknown');
        }
        return owner;
    });

    const responderLabel = (message: { responderFullName?: string; responderLogin: string }) => {
        const fullName = message.responderFullName?.trim();
        return fullName ? fullName : message.responderLogin;
    };

    const normalizeTicket = () => {
        if (!componentCtx.ticket.context) {
            componentCtx.ticket.context = [];
        }
        componentCtx.ticket.llmDescription = componentCtx.ticket.llmDescription ?? '';
        componentCtx.ticket.techContext = componentCtx.ticket.techContext ?? '';
        componentCtx.ticket.priority = componentCtx.ticket.priority ?? ('LOW' as PrivTicketPriority);
        componentCtx.ticket.assignedToLogin = componentCtx.ticket.assignedToLogin ?? '';
        componentCtx.ticket.status = componentCtx.ticket.status ?? ('OPEN' as PrivTicketStatus);
        componentCtx.ticket.responses = componentCtx.ticket.responses ?? [];

        for (const response of componentCtx.ticket.responses) {
            response.llmDescription = response.llmDescription ?? '';
        }

        if (componentCtx.ticket.assignedToLogin) {
            const exists = assigneeOptions.value.some(
                (item) => item.login === componentCtx.ticket.assignedToLogin
            );
            if (!exists) {
                assigneeOptions.value.push({
                    login: componentCtx.ticket.assignedToLogin,
                    fullName: componentCtx.ticket.assignedToFullName
                });
            }
        }
    };

    const backupTicket = () => {
        componentCtx.ticketBackup = JSON.parse(JSON.stringify(componentCtx.ticket));
        componentCtx.messageEdit = {};
        componentCtx.messageBackup = {};
        for (const response of componentCtx.ticket.responses || []) {
            componentCtx.messageEdit[response.id] = false;
            componentCtx.messageBackup[response.id] = {
                content: response.content ?? '',
                llmDescription: response.llmDescription ?? ''
            };
        }
    };

    const onError = () => {
        setTimeout(() => {
            componentCtx.submitError = null;
        }, 5000);
    };

    // --------------------------------------------------------------------
    // Managers list
    // --------------------------------------------------------------------

    const normalizeManagers = (payload: unknown): PrivTicketSupportManagersResponseItf[] => {
        if (Array.isArray(payload)) {
            return payload as PrivTicketSupportManagersResponseItf[];
        }
        if (payload && typeof payload === 'object') {
            const record = payload as {
                supportManagers?: PrivTicketSupportManagersResponseItf[];
                managers?: PrivTicketSupportManagersResponseItf[];
                items?: PrivTicketSupportManagersResponseItf[];
            };
            if (Array.isArray(record.supportManagers)) {
                return record.supportManagers;
            }
            if (Array.isArray(record.managers)) {
                return record.managers;
            }
            if (Array.isArray(record.items)) {
                return record.items;
            }
            return [payload as PrivTicketSupportManagersResponseItf];
        }
        return [];
    };

    const loadManagers = async () => {
        nuxtApp.$apiBackendTickets.ticketsModuleSupportManagersGet().then((res) => {
            if (!res.success) {
                return;
            }
            const managers = normalizeManagers(res.success);
            assigneeOptions.value = managers.map((manager) => ({
                login: manager.supportManagerLogin,
                fullName: manager.supportManagerFullName
            }));

            if (componentCtx.ticket?.assignedToLogin) {
                const exists = assigneeOptions.value.some(
                    (item) => item.login === componentCtx.ticket.assignedToLogin
                );
                if (!exists) {
                    assigneeOptions.value.push({
                        login: componentCtx.ticket.assignedToLogin,
                        fullName: componentCtx.ticket.assignedToFullName
                    });
                }
            }
        }).catch(() => {
            // Ignore error, assignee list can be empty.
        });
    };

    watch(
        () => componentCtx.ticket?.assignedToLogin,
        (login) => {
            const selected = assigneeOptions.value.find((item) => item.login === login);
            componentCtx.ticket.assignedToFullName = selected?.fullName ?? '';
        }
    );

    const responseError = computed(() => {
        const trimmed = (componentCtx.response.content || '').trim();
        componentCtx.response.content = trimmed;
        if (trimmed && trimmed.length > 0) {
            if (trimmed.length < 20) {
                return t('tickets.contactContentRequired');
            }
            return undefined;
        }
        return true;
    });

    const isSubmittingResponse = ref(false);
    const canSubmitResponse = computed(() => !responseError.value && !isSubmittingResponse.value);

    // --------------------------------------------------------------------
    // Get Ticket
    // --------------------------------------------------------------------

    const loadTicket = async () => {
        componentCtx.ticketLoading = true;
        componentCtx.ticketLoadingError = null;
        nuxtApp.$apiBackendTickets.ticketsModuleSupportOneTicket(componentCtx.ticketId).then((res) => {
            if (res.success) {
                componentCtx.ticket = res.success;
                normalizeTicket();
                backupTicket();
                fetchFileContextDetails();
            } else if (res.error) {
                componentCtx.ticketLoadingError = t('tickets.' + res.error.message);
            }
        }).catch(() => {
            componentCtx.ticketLoadingError = t('common.unknownError');
        }).finally(() => {
            componentCtx.ticketLoading = false;
        });
    };

    onMounted(() => {
        componentCtx.ticketId = route.params.ticketId as string;
        loadManagers();
        loadTicket();
    });

    // --------------------------------------------------------------------
    // Ticket updates
    // --------------------------------------------------------------------

    const onSaveTicket = async () => {
        componentCtx.submitError = null;
        componentCtx.ticketSaving = true;

        const updateBody: PrivTicketUpdateBody = {
            id: componentCtx.ticket.id,
            quickUpdate: false,
            topic: componentCtx.ticket.topic ?? '',
            content: componentCtx.ticket.content ?? '',
            context: componentCtx.ticket.context ?? [],
            llmDescription: componentCtx.ticket.llmDescription ?? '',
            priority: componentCtx.ticket.priority ?? ('LOW' as PrivTicketPriority),
            assignedTo: componentCtx.ticket.assignedToLogin ?? '',
            techContext: componentCtx.ticket.techContext ?? '',
            faqEligible: componentCtx.ticket.faqEligible ?? false,
            faqPublic: componentCtx.ticket.faqPublic ?? false, 
            status: componentCtx.ticket.status ?? ('OPEN' as PrivTicketStatus), 
        };

        const updatePayload = {
            ...updateBody,
            status: componentCtx.ticket.status
        } as PrivTicketUpdateBody & { status?: PrivTicketStatus };

        nuxtApp.$apiBackendTickets.ticketsModulePrivateTicketUpdate(updatePayload).then((res) => {
            if (res.success) {
                backupTicket();
                toast.add({
                    title: t('tickets.ticketUpdateSuccessfully'),
                    description: t('tickets.ticketUpdateSuccessfullyDesc'),
                    icon: 'i-lucide-arrow-big-up-dash'
                });
            } else if (res.error) {
                componentCtx.submitError = t('tickets.' + res.error.message);
                onError();
            }
        }).catch(() => {
            componentCtx.submitError = t('common.unknownError');
            onError();
        }).finally(() => {
            componentCtx.ticketSaving = false;
        });
    };

    const onCancelTicket = async () => {
        if (componentCtx.ticketBackup) {
            componentCtx.ticket = JSON.parse(JSON.stringify(componentCtx.ticketBackup));
            normalizeTicket();
            backupTicket();
        }
        await navigateTo('/front/private/support');
    };

    // --------------------------------------------------------------------
    // Ticket responses
    // --------------------------------------------------------------------

    const onEditMessage = async (messageId: string) => {
        componentCtx.messageEdit[messageId] = true;
    };

    const onSaveMessage = async (messageId: string) => {
        const message = componentCtx.ticket.responses?.find((item) => item.id === messageId);
        if (!message) {
            return;
        }
        componentCtx.ticketSaving = true;

        const updateBody: PrivTicketUpdateMessageBody = {
            id: componentCtx.ticket.id,
            messageId: messageId,
            content: message.content ?? '',
            withLlmContent: true,
            llmContent: message.llmDescription ?? ''
        };

        nuxtApp.$apiBackendTickets.ticketsModulePrivateTicketUpdateMessage(updateBody).then((res) => {
            if (res.success) {
                componentCtx.messageBackup[messageId] = {
                    content: updateBody.content,
                    llmDescription: updateBody.llmContent ?? ''
                };
                componentCtx.messageEdit[messageId] = false;
                toast.add({
                    title: t('tickets.ticketUpdateSuccessfully'),
                    description: t('tickets.ticketUpdateSuccessfullyDesc'),
                    icon: 'i-lucide-arrow-big-up-dash'
                });
            } else if (res.error) {
                componentCtx.submitError = t('tickets.' + res.error.message);
                onError();
            }
        }).catch(() => {
            componentCtx.submitError = t('common.unknownError');
            onError();
        }).finally(() => {
            componentCtx.ticketSaving = false;
        });
    };

    const onCancelMessage = async (messageId: string) => {
        const backup = componentCtx.messageBackup[messageId];
        const message = componentCtx.ticket.responses?.find((item) => item.id === messageId);
        if (backup && message) {
            message.content = backup.content;
            message.llmDescription = backup.llmDescription;
        }
        componentCtx.messageEdit[messageId] = false;
    };

    // --------------------------------------------------------------------
    // Add response
    // --------------------------------------------------------------------

    const onAiResponse = async () => {
        componentCtx.submitError = null;
        componentCtx.aiLoading = true;
        nuxtApp.$apiBackendTickets.ticketsModuleSupportAiResponseGet(componentCtx.ticketId).then((res) => {
            if (res.success) {
                componentCtx.response.content = res.success.response || '';
            } else if (res.error) {
                componentCtx.submitError = t('tickets.' + res.error.message);
                onError();
            }
        }).catch(() => {
            componentCtx.submitError = t('common.unknownError');
            onError();
        }).finally(() => {
            componentCtx.aiLoading = false;
        });
    };

    const onSubmitResponse = async () => {
        componentCtx.submitError = null;
        if (!canSubmitResponse.value) {
            componentCtx.submitError = t('tickets.contactFormInvalid');
            onError();
            return;
        }

        isSubmittingResponse.value = true;
        componentCtx.response.id = componentCtx.ticket.id;
        componentCtx.response.closeTicket = false;
        componentCtx.response.closeKb = false;
        componentCtx.response.adminContent = '';
        componentCtx.response.authKey = '';

        nuxtApp.$apiBackendTickets.ticketsModulePrivateUpdate(componentCtx.response).then((res) => {
            if (res.success) {
                componentCtx.response = {} as PrivTicketUserMessageBody;
                loadTicket();
                toast.add({
                    title: t('tickets.responseAddedSuccessfully'),
                    description: t('tickets.responseAddedSuccessfullyDesc'),
                    icon: 'i-lucide-arrow-big-up-dash'
                });
            } else if (res.error) {
                componentCtx.submitError = t('tickets.' + res.error.message);
                onError();
            }
        }).catch(() => {
            componentCtx.submitError = t('common.unknownError');
            onError();
        }).finally(() => {
            isSubmittingResponse.value = false;
        });
    };

    // --------------------------------------------------------------------
    // Custom fields & file attachments
    // --------------------------------------------------------------------

    const addCustomField = () => {
        if (!componentCtx.ticket.context) {
            componentCtx.ticket.context = [];
        }
        componentCtx.ticket.context.push({ name: '', value: '' });
    };

    const removeCustomField = (index: number) => {
        componentCtx.ticket.context?.splice(index, 1);
    };

    // --- File cache (keyed by uniqueName) ---
    const fileCache = ref<Record<string, FileUploadResponseItf>>({});

    const fetchFileContextDetails = async () => {
        if (!componentCtx.ticket.context) return;
        const uniqueNames = componentCtx.ticket.context
            .filter(f => f.value.startsWith('file_'))
            .map(f => f.value.slice(5));
        await Promise.all(uniqueNames.map(async (un) => {
            if (fileCache.value[un]) return;
            const res = await nuxtApp.$apiBackendFiles.filesAdminGetFile(un);
            if (res.success) fileCache.value[un] = res.success;
        }));
    };

    const getMarkdownLink = (file: FileUploadResponseItf): string => {
        const url = `${config.public.BACKEND_API_BASE}/files/1.0/${file.uniqueName}/full?key=${file.accessKey}`;
        return file.mimeCategory === 'IMAGE'
            ? `![${file.originalName}](${url})`
            : `[${file.originalName}](${url})`;
    };

    const getFileUrl = (un: string): string | null => {
        const file = fileCache.value[un];
        if (!file) return null;
        return `${config.public.BACKEND_API_BASE}/files/1.0/${un}/full?key=${file.accessKey}`;
    };

    // --- File preview modal ---
    const filePreviewModalOpen = ref(false);
    const filePreviewTarget = ref<FileUploadResponseItf | null>(null);
    const filePreviewText = ref<string | null>(null);
    const filePreviewLoading = ref(false);

    const openFilePreviewModal = async (un: string) => {
        const file = fileCache.value[un];
        if (!file) return;
        filePreviewTarget.value = file;
        filePreviewText.value = null;
        filePreviewModalOpen.value = true;
        if (file.mimeCategory === 'TEXT') {
            filePreviewLoading.value = true;
            try {
                const url = getFileUrl(un);
                if (url) {
                    const res = await fetch(url);
                    filePreviewText.value = await res.text();
                }
            } catch {
                filePreviewText.value = null;
            } finally {
                filePreviewLoading.value = false;
            }
        }
    };

    const getThumbnailUrl = (un: string): string => {
        const file = fileCache.value[un];
        if (!file) return '';
        return `${config.public.BACKEND_API_BASE}/files/1.0/${un}/thumbnail?key=${file.accessKey}`;
    };

    // --- Attach modal ---
    const showAttachModal = ref(false);
    const attachCallback = ref<((f: FileUploadResponseItf) => void) | null>(null);

    const notifyInserted = () =>
        toast.add({ title: t('tickets.attachInsertedInMessage'), icon: 'i-lucide-paperclip', color: 'success', duration: 3000 });

    const openAttachModal = (cb: (f: FileUploadResponseItf) => void) => {
        attachCallback.value = cb;
        showAttachModal.value = true;
    };

    const onFileAttached = (file: FileUploadResponseItf) => {
        if (!componentCtx.ticket.context) componentCtx.ticket.context = [];
        componentCtx.ticket.context.push({ name: `${file.mimeCategory.toLowerCase()}_${Date.now()}`, value: `file_${file.uniqueName}` });
        fileCache.value[file.uniqueName] = file;
        if (attachCallback.value) {
            attachCallback.value(file);
            attachCallback.value = null;
        }
        showAttachModal.value = false;
    };

    // Named helpers for template attach buttons
    const onAttachToContent = () => openAttachModal((f) => {
        componentCtx.ticket.content = ((componentCtx.ticket.content || '') + '\n' + getMarkdownLink(f)).trimStart();
        notifyInserted();
    });
    const onAttachToLlmDescription = () => openAttachModal((f) => {
        componentCtx.ticket.llmDescription = ((componentCtx.ticket.llmDescription || '') + '\n' + getMarkdownLink(f)).trimStart();
        notifyInserted();
    });
    const onAttachToTechContext = () => openAttachModal((f) => {
        componentCtx.ticket.techContext = ((componentCtx.ticket.techContext || '') + '\n' + getMarkdownLink(f)).trimStart();
        notifyInserted();
    });
    const onAttachToResponse = () => openAttachModal((f) => {
        componentCtx.response.content = ((componentCtx.response.content || '') + '\n' + getMarkdownLink(f)).trimStart();
        notifyInserted();
    });
    const onAttachToMessage = (message: { content: string }) => openAttachModal((f) => {
        message.content = ((message.content || '') + '\n' + getMarkdownLink(f)).trimStart();
        notifyInserted();
    });

    // Delete context field AND its file from the server
    const onDeleteContextFile = async (index: number) => {
        const field = componentCtx.ticket.context?.[index];
        if (!field || !field.value.startsWith('file_')) return;
        const un = field.value.slice(5);
        componentCtx.ticket.context!.splice(index, 1);
        delete fileCache.value[un];
        await nuxtApp.$apiBackendFiles.filesAdminDelete(un);
    };

    const onCopyFileLink = (un: string) => {
        const file = fileCache.value[un];
        if (!file) return;
        navigator.clipboard.writeText(getMarkdownLink(file));
        toast.add({ title: t('tickets.attachMarkdownCopied'), icon: 'i-lucide-clipboard-check', color: 'success', duration: 3000 });
    };

    // --- File edit modal ---
    const fileEditModalOpen = ref(false);
    const fileEditTarget = ref<FileUploadResponseItf | null>(null);
    const fileEditDraft = reactive({ description: '', accessType: 'PRIVATE' as FileAccessType, withShortName: false, withAccessKey: false });
    const fileEditSaving = ref(false);
    const fileEditError = ref<string | null>(null);
    const accessTypeOptions = computed(() => [
        { label: t('files.accessPrivate'),   value: 'PRIVATE'   as FileAccessType },
        { label: t('files.accessConnected'), value: 'CONNECTED' as FileAccessType },
        { label: t('files.accessPublic'),    value: 'PUBLIC'    as FileAccessType },
    ]);

    const openFileEditModal = (un: string) => {
        const file = fileCache.value[un];
        if (!file) return;
        fileEditTarget.value = { ...file };
        fileEditDraft.description = file.description ?? '';
        fileEditDraft.accessType = (file.accessType as FileAccessType) ?? 'PRIVATE';
        fileEditDraft.withShortName = !!file.shortName;
        fileEditDraft.withAccessKey = !!file.accessKey;
        fileEditError.value = null;
        fileEditModalOpen.value = true;
    };

    const onSaveFileEdit = async () => {
        if (!fileEditTarget.value) return;
        fileEditSaving.value = true;
        fileEditError.value = null;
        const body: FileUpdateBody = {
            accessType: fileEditDraft.accessType,
            description: fileEditDraft.description || undefined,
            withShortName: fileEditDraft.withShortName,
            withAccessKey: fileEditDraft.withAccessKey,
        };
        const res = await nuxtApp.$apiBackendFiles.filesAdminUpdate(fileEditTarget.value.uniqueName, body);
        if (res.success) {
            fileCache.value[fileEditTarget.value.uniqueName] = res.success;
            fileEditModalOpen.value = false;
        } else {
            fileEditError.value = t('files.' + ((res.error as any)?.message ?? 'unknownError'));
        }
        fileEditSaving.value = false;
    };

    // --------------------------------------------------------------------
    // Editor Toolbar
    // --------------------------------------------------------------------
    const customHandlers = {} satisfies EditorCustomHandlers;

    const fixedToolbarItems = [
        [{
            kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' }
        }, {
            kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' }
        }], [{
            kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' }
        }, {
            kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' }
        }, {
            kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' }
        }, {
            kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' }
        }], [{
            kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' }
        }, {
            kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' }
        }], [{
            icon: 'i-lucide-align-justify', tooltip: { text: 'Text Align' }, content: { align: 'end' },
            items: [{
                kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left', label: 'Align Left'
            }, {
                kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center', label: 'Align Center'
            }, {
                kind: 'textAlign', align: 'right', icon: 'i-lucide-align-right', label: 'Align Right'
            }, {
                kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: 'Align Justify'
            }]
        }], [{
            icon: 'i-lucide-heading', tooltip: { text: 'Headings' }, content: { align: 'start' },
            items: [{
                kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1'
            }, {
                kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2'
            }, {
                kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3'
            }, {
                kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4'
            }]
        }, {
            icon: 'i-lucide-list', tooltip: { text: 'Lists' }, content: { align: 'start' },
            items: [{
                kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List'
            }, {
                kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List'
            }]
        }, {
            kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' }
        }]
    ] satisfies EditorToolbarItem<typeof customHandlers>[][];
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-4xl mx-auto mb-4">
        <UPageCard
            :title="$t('tickets.ticketDetailsTitle')"
            :description="$t('tickets.ticketDetailsDescription')"
            variant="naked"
            orientation="horizontal"
        />

        <UCard class="w-full" variant="subtle">
            <template #header>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex flex-col gap-1 text-sm text-neutral-500">
                        <div>
                            <span class="font-semibold text-neutral-700 dark:text-neutral-200">
                                {{ $t('tickets.ticketOwnerLabel') }}
                            </span>
                            {{ ticketOwnerLabel }}
                        </div>
                        <div v-if="ticketCreatedAgo">
                            <span class="font-semibold text-neutral-700 dark:text-neutral-200">
                                {{ $t('tickets.ticketCreatedLabel') }}
                            </span>
                            {{ $t('tickets.ticketCreatedAgo', { timeAgo: ticketCreatedAgo }) }}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <UButton
                            :label="$t('tickets.ticketCancel')"
                            color="neutral"
                            icon="i-lucide-square-x"
                            :disabled="componentCtx.ticketSaving"
                            @click="onCancelTicket"
                        />
                        <UButton
                            :label="$t('tickets.ticketSave')"
                            color="neutral"
                            icon="i-lucide-save"
                            :disabled="componentCtx.ticketSaving"
                            @click="onSaveTicket"
                        />
                    </div>
                </div>
            </template>

            <UForm :state="componentCtx.ticket" class="w-full" @submit="() => {}">
                <UFormField
                    name="status"
                    :label="$t('tickets.ticketStatusLabel')"
                    class="flex max-sm:flex-col justify-between items-start gap-4 mb-4"
                >
                    <USelectMenu
                        v-model="componentCtx.ticket.status"
                        :items="statusOptions"
                        value-key="value"
                        label-key="label"
                        class="w-70"
                    />
                </UFormField>

                <UFormField
                    name="priority"
                    :label="$t('tickets.ticketPriorityLabel')"
                    class="flex max-sm:flex-col justify-between items-start gap-4 mb-4"
                >
                    <USelectMenu
                        v-model="componentCtx.ticket.priority"
                        :items="priorityOptions"
                        value-key="value"
                        label-key="label"
                        class="w-70"
                    />
                </UFormField>

                <UFormField
                    name="assignedTo"
                    :label="$t('tickets.ticketAssignedLabel')"
                    class="flex max-sm:flex-col justify-between items-start gap-4 mb-4"
                >
                    <USelectMenu
                        v-model="assigneeSelection"
                        :items="assigneeItems"
                        value-key="value"
                        label-key="label"
                        :searchable="true"
                        class="w-70"
                    />
                </UFormField>

                <UFormField
                    name="topic"
                    :label="$t('tickets.ticketTopicLabel')"
                    class="flex flex-col gap-2 mb-4"
                >
                    <UEditor
                        v-model="componentCtx.ticket.topic"
                        content-type="markdown"
                        class="w-full bg-white dark:bg-gray-800"
                        :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                        v-slot="{ editor }"
                        :ui="{ base: 'min-h-12' }"
                    >
                        <UEditorToolbar
                            :editor="editor"
                            :items="fixedToolbarItems"
                            class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                        />
                    </UEditor>
                </UFormField>

                <UFormField
                    name="content"
                    :label="$t('tickets.ticketContentLabel')"
                    class="flex flex-col gap-2 mb-4"
                >
                    <UEditor
                        v-model="componentCtx.ticket.content"
                        content-type="markdown"
                        class="w-full bg-white dark:bg-gray-800"
                        :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                        v-slot="{ editor }"
                        :ui="{ base: 'min-h-40' }"
                    >
                        <UEditorToolbar
                            :editor="editor"
                            :items="fixedToolbarItems"
                            class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                        />
                    </UEditor>
                    <div class="flex justify-start mt-1">
                        <UButton :label="$t('tickets.attachFile')" color="neutral" variant="soft" size="xs"
                            icon="i-lucide-paperclip" @click="onAttachToContent" />
                    </div>
                </UFormField>

                <UFormField
                    name="llmDescription"
                    :label="$t('tickets.ticketLlmLabel')"
                    class="flex flex-col gap-2 mb-4"
                >
                    <UEditor
                        v-model="componentCtx.ticket.llmDescription"
                        content-type="markdown"
                        class="w-full bg-white dark:bg-gray-800"
                        :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                        v-slot="{ editor }"
                        :ui="{ base: 'min-h-40' }"
                    >
                        <UEditorToolbar
                            :editor="editor"
                            :items="fixedToolbarItems"
                            class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                        />
                    </UEditor>
                    <div class="flex justify-start mt-1">
                        <UButton :label="$t('tickets.attachFile')" color="neutral" variant="soft" size="xs"
                            icon="i-lucide-paperclip" @click="onAttachToLlmDescription" />
                    </div>
                </UFormField>

                <UFormField
                    name="techContext"
                    :label="$t('tickets.ticketTechContextLabel')"
                    class="flex flex-col gap-2 mb-4"
                >
                    <UEditor
                        v-model="componentCtx.ticket.techContext"
                        content-type="markdown"
                        class="w-full bg-white dark:bg-gray-800"
                        :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                        v-slot="{ editor }"
                        :ui="{ base: 'min-h-32' }"
                    >
                        <UEditorToolbar
                            :editor="editor"
                            :items="fixedToolbarItems"
                            class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                        />
                    </UEditor>
                    <div class="flex justify-start mt-1">
                        <UButton :label="$t('tickets.attachFile')" color="neutral" variant="soft" size="xs"
                            icon="i-lucide-paperclip" @click="onAttachToTechContext" />
                    </div>
                </UFormField>

                <UFormField
                    name="faqEligible"
                    :label="$t('tickets.ticketFaqEligibleLabel')"
                    class="flex max-sm:flex-col justify-between items-start gap-4 mb-4"
                >
                    <UCheckbox v-model="componentCtx.ticket.faqEligible" color="neutral" />
                </UFormField>

                <UFormField
                    name="faqPublic"
                    :label="$t('tickets.ticketFaqPublicLabel')"
                    class="flex max-sm:flex-col justify-between items-start gap-4 mb-4"
                >
                    <UCheckbox v-model="componentCtx.ticket.faqPublic" color="neutral" />
                </UFormField>

                <UFormField
                    name="context"
                    :label="$t('tickets.ticketContextLabel')"
                    class="flex flex-col gap-2 mb-4"
                >
                    <div class="flex flex-col gap-2">
                        <div
                            v-for="(field, index) in componentCtx.ticket.context"
                            :key="`context-${index}`"
                            class="grid grid-cols-[1fr_2fr_6rem] items-center gap-2"
                        >
                            <!-- Block 1 : icon/thumbnail + editable name -->
                            <div class="flex items-center gap-2 min-w-0">
                                <template v-if="field.value.startsWith('file_')">
                                    <img
                                        v-if="fileCache[field.value.slice(5)]?.mimeCategory === 'IMAGE' && fileCache[field.value.slice(5)]?.thumbnailUniqueName"
                                        :src="getThumbnailUrl(field.value.slice(5))"
                                        class="w-5 h-5 object-cover rounded shrink-0"
                                        :alt="fileCache[field.value.slice(5)]?.originalName ?? ''"
                                    />
                                    <UIcon v-else name="i-lucide-file" class="w-5 h-5 shrink-0 text-muted" />
                                </template>
                                <UInput
                                    v-model="field.name"
                                    :placeholder="$t('tickets.ticketContextKey')"
                                    class="flex-1 min-w-0"
                                />
                            </div>
                            <!-- Block 2 : value (editable for regular, readonly for file) -->
                            <UInput
                                v-if="field.value.startsWith('file_')"
                                :model-value="fileCache[field.value.slice(5)]?.originalName ?? field.value.slice(5)"
                                disabled
                            />
                            <UInput
                                v-else
                                v-model="field.value"
                                :placeholder="$t('tickets.ticketContextValue')"
                            />
                            <!-- Block 3 : actions -->
                            <div class="flex items-center justify-end gap-1 w-full">
                                <template v-if="field.value.startsWith('file_')">
                                    <UButton
                                        icon="i-lucide-link"
                                        size="xs" variant="ghost" color="neutral"
                                        :disabled="!fileCache[field.value.slice(5)]?.accessKey"
                                        :aria-label="$t('tickets.attachCopyMarkdown')"
                                        :title="$t('tickets.attachCopyMarkdown')"
                                        @click="onCopyFileLink(field.value.slice(5))"
                                    />
                                    <UButton
                                        icon="i-lucide-external-link"
                                        size="xs" variant="ghost" color="neutral"
                                        :disabled="!fileCache[field.value.slice(5)]"
                                        :aria-label="$t('tickets.attachOpenInTab')"
                                        :title="$t('tickets.attachOpenInTab')"
                                        @click="openFilePreviewModal(field.value.slice(5))"
                                    />
                                    <UButton
                                        icon="i-lucide-pencil"
                                        size="xs" variant="ghost" color="neutral"
                                        :disabled="!fileCache[field.value.slice(5)]"
                                        :aria-label="$t('files.actionEdit')"
                                        :title="$t('files.actionEdit')"
                                        @click="openFileEditModal(field.value.slice(5))"
                                    />
                                    <UButton
                                        icon="i-lucide-trash-2"
                                        size="xs" variant="ghost" color="error"
                                        :aria-label="$t('files.actionDelete')"
                                        :title="$t('files.actionDelete')"
                                        @click="onDeleteContextFile(index)"
                                    />
                                </template>
                                <UButton
                                    v-else
                                    icon="i-lucide-trash-2"
                                    size="xs"
                                    color="neutral"
                                    variant="ghost"
                                    @click="removeCustomField(index)"
                                />
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UButton
                                :label="$t('tickets.ticketContextAdd')"
                                icon="i-lucide-plus"
                                color="neutral"
                                variant="ghost"
                                class="w-fit"
                                @click="addCustomField"
                            />
                            <UButton
                                :label="$t('tickets.attachFile')"
                                icon="i-lucide-paperclip"
                                color="neutral"
                                variant="ghost"
                                class="w-fit"
                                @click="openAttachModal(() => {})"
                            />
                        </div>
                    </div>
                </UFormField>
            </UForm>

            <div v-if="componentCtx.submitError" class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <div class="flex flex-col items-center gap-4">
                    <div class="mb-2 text-lg text-center text-red-600 font-bold">
                        {{ componentCtx.submitError }}
                    </div>
                </div>
            </div>
        </UCard>

        <UCard class="w-full" variant="subtle">
            <template #header>
                <span class="font-bold">{{ $t('tickets.ticketResponsesTitle') }}</span>
            </template>

            <div v-if="!componentCtx.ticket.responses?.length" class="text-sm text-neutral-500">
                {{ $t('tickets.ticketResponsesEmpty') }}
            </div>

            <div v-for="message in componentCtx.ticket.responses" :key="message.id" class="flex gap-2 items-start mt-4">
                <div class="border-l-4 border-accented bg-white dark:bg-gray-800 p-4 rounded-md flex-1">
                    <div class="flex items-center justify-between text-xs text-neutral-500 mb-2">
                        <span class="font-semibold text-neutral-700 dark:text-neutral-200">
                            {{ responderLabel(message) }}
                        </span>
                        <span>
                            {{ $t('tickets.ticketCreatedAgo', { timeAgo: $formatDuration((Date.now() - message.creationMs) / 1000) }) }}
                        </span>
                    </div>

                    <div v-if="!componentCtx.messageEdit[message.id]" class="space-y-4">
                        <MDC :value="message.content" class="[&_*]:!my-0" />
                        <div>
                            <div class="text-xs uppercase text-neutral-500 mb-1">
                                {{ $t('tickets.ticketResponseLlmLabel') }}
                            </div>
                            <MDC :value="message.llmDescription" class="[&_*]:!my-0" />
                        </div>
                    </div>

                    <div v-else class="space-y-4">
                        <UEditor
                            v-model="message.content"
                            content-type="markdown"
                            class="w-full bg-white dark:bg-gray-800"
                            :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                            v-slot="{ editor }"
                            :ui="{ base: 'min-h-32' }"
                        >
                            <UEditorToolbar
                                :editor="editor"
                                :items="fixedToolbarItems"
                                class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                            />
                        </UEditor>
                        <div class="flex justify-start -mt-2">
                            <UButton :label="$t('tickets.attachFile')" color="neutral" variant="soft" size="xs"
                                icon="i-lucide-paperclip" @click="onAttachToMessage(message)" />
                        </div>

                        <div>
                            <div class="text-xs uppercase text-neutral-500 mb-1">
                                {{ $t('tickets.ticketResponseLlmLabel') }}
                            </div>
                            <UEditor
                                v-model="message.llmDescription"
                                content-type="markdown"
                                class="w-full bg-white dark:bg-gray-800"
                                :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                                v-slot="{ editor }"
                                :ui="{ base: 'min-h-24' }"
                            >
                                <UEditorToolbar
                                    :editor="editor"
                                    :items="fixedToolbarItems"
                                    class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                                />
                            </UEditor>
                        </div>
                    </div>
                </div>

                <UIcon
                    v-if="!componentCtx.messageEdit[message.id]"
                    name="i-lucide-square-pen"
                    class="mt-4 flex-shrink-0 size-5 cursor-pointer"
                    @click="onEditMessage(message.id)"
                />
                <div v-else class="flex flex-col gap-2 mt-4">
                    <UIcon
                        name="i-lucide-square-x"
                        class="flex-shrink-0 size-5 cursor-pointer"
                        @click="onCancelMessage(message.id)"
                    />
                    <UIcon
                        name="i-lucide-save"
                        class="flex-shrink-0 size-5 cursor-pointer"
                        @click="onSaveMessage(message.id)"
                    />
                </div>
            </div>

            <div class="mt-6 border-t border-accented pt-4">
                <UForm :state="componentCtx.responseFormState" class="w-full" @submit="() => {}">
                  <div class="flex justify-end mr-2">
                    <UButton
                      label="AI"
                      icon="i-lucide-sparkles"
                      color="neutral"
                      size="xs"
                      type="button"
                      :loading="componentCtx.aiLoading"
                      :disabled="componentCtx.aiLoading"
                      @click="onAiResponse"
                    />
                  </div>
                  <UFormField
                        name="responseContent"
                        :label="$t('tickets.responseContentLabel')"
                        :description="$t('tickets.responseContentDescription')"
                        :error="responseError"
                        required
                        class="flex flex-col gap-2 mb-2"
                    >
                        <div class="w-full">
                            <div class="bg-white dark:bg-gray-800 w-full pr-4">
                                <UEditor
                                    v-model="componentCtx.response.content"
                                    content-type="markdown"
                                    class="w-full bg-white dark:bg-gray-800"
                                    :extensions="[TextAlign.configure({ types: ['heading', 'paragraph'] })]"
                                    v-slot="{ editor }"
                                    :ui="{ base: 'min-h-40' }"
                                >
                                    <UEditorToolbar
                                        :editor="editor"
                                        :items="fixedToolbarItems"
                                        class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center"
                                    />
                                </UEditor>
                            </div>
                        </div>
                        <div class="flex justify-end mt-2 mr-1">
                            <UButton :label="$t('tickets.attachFile')" color="neutral" variant="soft" size="xs"
                                icon="i-lucide-paperclip" class="mr-auto"
                                @click="onAttachToResponse" />
                            <UButton
                                :label="$t('tickets.responseAdd')"
                                :disabled="!canSubmitResponse"
                                color="neutral"
                                type="submit"
                                @click="onSubmitResponse"
                                icon="i-lucide-square-plus"
                                class="px-2"
                                size="xs"
                            />
                        </div>
                    </UFormField>
                </UForm>
            </div>
        </UCard>

        <div v-if="componentCtx.ticketLoading" class="relative min-h-24">
            <div class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <UProgress color="neutral" />
            </div>
        </div>

        <div v-if="componentCtx.ticketLoadingError" class="text-center text-red-600 font-bold">
            {{ componentCtx.ticketLoadingError }}
        </div>

        <!-- File preview modal -->
        <UModal v-model:open="filePreviewModalOpen"
                :title="filePreviewTarget?.originalName ?? ''"
                :ui="{ content: 'max-w-4xl w-full' }"
        >
            <template #body>
                <div v-if="filePreviewTarget" class="flex flex-col items-center justify-center min-h-40">
                    <!-- Image -->
                    <img
                        v-if="filePreviewTarget.mimeCategory === 'IMAGE'"
                        :src="getFileUrl(filePreviewTarget.uniqueName) ?? ''"
                        :alt="filePreviewTarget.originalName"
                        class="max-w-full max-h-[70vh] object-contain rounded"
                    />
                    <!-- PDF -->
                    <iframe
                        v-else-if="filePreviewTarget.mimeCategory === 'PDF'"
                        :src="getFileUrl(filePreviewTarget.uniqueName) ?? ''"
                        class="w-full h-[75vh] border-0 rounded"
                        type="application/pdf"
                    />
                    <!-- Text (CSV, TXT, JSON…) -->
                    <template v-else-if="filePreviewTarget.mimeCategory === 'TEXT'">
                        <UIcon v-if="filePreviewLoading" name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-muted" />
                        <pre v-else-if="filePreviewText !== null" class="w-full max-h-[70vh] overflow-auto text-sm bg-muted rounded p-4 whitespace-pre-wrap break-all">{{ filePreviewText }}</pre>
                        <span v-else class="text-sm text-muted">{{ $t('tickets.previewUnavailable') }}</span>
                    </template>
                    <!-- Other -->
                    <span v-else class="text-sm text-muted">{{ $t('tickets.previewUnavailable') }}</span>
                </div>
            </template>
        </UModal>

        <!-- File attach modal -->
        <UModal v-model:open="showAttachModal"
                :title="$t('tickets.attachModalTitle')"
                :description="$t('tickets.attachModalDescription')"
        >
            <template #body>
                <FilesUploadForm
                    forced-access-type="PRIVATE"
                    :forced-with-access-key="true"
                    @uploaded="onFileAttached"
                    @cancelled="showAttachModal = false"
                />
            </template>
        </UModal>

        <!-- File edit modal -->
        <UModal v-model:open="fileEditModalOpen" :title="$t('files.actionEdit')">
            <template #body>
                <div v-if="fileEditTarget" class="flex flex-col gap-4">
                    <UFormField :label="$t('files.editFileName')">
                        <UInput :model-value="fileEditTarget.originalName" readonly class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('files.editDescription')">
                        <UInput v-model="fileEditDraft.description"
                            :placeholder="$t('files.editDescriptionPlaceholder')" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('files.editAccessType')">
                        <USelectMenu v-model="fileEditDraft.accessType" value-key="value"
                            :items="accessTypeOptions" class="w-52" />
                    </UFormField>
                    <UFormField :label="$t('files.editWithShortName')" :description="$t('files.editWithShortNameDesc')">
                        <USwitch v-model="fileEditDraft.withShortName" />
                    </UFormField>
                    <UFormField :label="$t('files.editWithAccessKey')" :description="$t('files.editWithAccessKeyDesc')">
                        <USwitch v-model="fileEditDraft.withAccessKey" />
                    </UFormField>
                    <div v-if="fileEditError" class="text-sm text-red-600">{{ fileEditError }}</div>
                    <div class="flex justify-end gap-2">
                        <UButton color="neutral" variant="ghost" :label="$t('files.editCancel')"
                            @click="fileEditModalOpen = false" />
                        <UButton color="neutral" icon="i-lucide-save" :label="$t('files.editSave')"
                            :loading="fileEditSaving" @click="onSaveFileEdit" />
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
