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

    definePageMeta({ layout: 'main-layout', layoutProps: { title: 'ticketAdvEdition' } });

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const toast = useToast();
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
    // Custom fields
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
                            class="flex flex-col gap-2 sm:flex-row sm:items-center"
                        >
                            <UInput v-model="field.name" :placeholder="$t('tickets.ticketContextKey')" class="w-full sm:w-1/3" />
                            <UInput v-model="field.value" :placeholder="$t('tickets.ticketContextValue')" class="w-full sm:w-2/3" />
                            <UButton
                                icon="i-lucide-trash-2"
                                color="neutral"
                                variant="ghost"
                                @click="removeCustomField(index)"
                            />
                        </div>
                        <UButton
                            :label="$t('tickets.ticketContextAdd')"
                            icon="i-lucide-plus"
                            color="neutral"
                            variant="ghost"
                            class="w-fit"
                            @click="addCustomField"
                        />
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
    </div>
</template>
