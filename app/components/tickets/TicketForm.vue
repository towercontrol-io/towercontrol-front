<script setup lang="ts">
    import { computed, reactive, ref } from 'vue';
    import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
    import { TextAlign } from '@tiptap/extension-text-align'
    import type { PrivTicketCreationBody, PrivTicketCreationResponseItf } from '~/types';
    import type { ActionResult, FileUploadResponseItf, CustomField } from '~/types';

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const config = useRuntimeConfig();
    const toast = useToast();

    const formState = reactive<PrivTicketCreationBody>({
        topic: '',
        content: '',
        email: '',
    });


    // Topic
    const topicFocused = ref(false);
    const topicError = computed(() => {
        const trimmed = (formState.topic || '').replace(/\r?\n/g, ' ').trim();
        formState.topic = trimmed;
        if ( trimmed && trimmed.length > 0) {
          if (trimmed.length < 5) {
              return t('tickets.contactTopicMinLength');
          }
          if (!/[A-Za-z0-9]/.test(trimmed)) {
              return t('tickets.contactTopicInvalid');
          }
          return undefined;
        }
        return true;
    });

    // Content
    const contentRef = useTemplateRef('contentRef')
    const contentFocused = ref(false);
    const contentError = computed(() => {
      const trimmed = formState.content?.trim();
      if ( trimmed && trimmed.length > 0) {
        if (trimmed.length < 20) {
            return t('tickets.contactContentRequired');
        }
        return undefined;
      }
      return true;
    });

    // --------------------------------------------------------------------
    // File attachments
    // --------------------------------------------------------------------

    const attachedFiles = ref<FileUploadResponseItf[]>([]);
    const showAttachModal = ref(false);

    const onFileAttached = (file: FileUploadResponseItf) => {
        attachedFiles.value.push(file);
        showAttachModal.value = false;
    };

    const onRemoveAttachment = (idx: number) => {
        attachedFiles.value.splice(idx, 1);
    };

    const getAttachmentThumbnailUrl = (file: FileUploadResponseItf): string => {
        return `${config.public.BACKEND_API_BASE}/files/1.0/${file.uniqueName}/thumbnail?key=${file.accessKey}`;
    };

    const getAttachmentMarkdownLink = (file: FileUploadResponseItf): string => {
        const url = `${config.public.BACKEND_API_BASE}/files/1.0/${file.uniqueName}/full?key=${file.accessKey}`;
        return `![${file.originalName}](${url})`;
    };

    const onCopyAttachmentMarkdown = (file: FileUploadResponseItf) => {
        navigator.clipboard.writeText(getAttachmentMarkdownLink(file));
        toast.add({ title: t('tickets.attachMarkdownCopied'), icon: 'i-lucide-clipboard-check', color: 'success', duration: 3000 });
    };

    // ----------------------------------------------------
    // Submission
    // ----------------------------------------------------

    const isSubmitting = ref(false);
    const submitError = ref<string | null>(null);
    const submitSuccess = ref<PrivTicketCreationResponseItf | null>(null);
    const canSubmit = computed(() => !topicError.value && !contentError.value && !isSubmitting.value);

    const resolveErrorMessage = (error?: ActionResult | { message: string }) => {
        if (!error) {
            return t('common.unknownError');
        }
        const message = error.message || t('common.unknownError');
        const key = `tickets.${message}`;
        const translated = t(key);
        return translated !== key ? translated : message;
    };

    const onSubmit = async () => {
        submitError.value = null;
        submitSuccess.value = null;

        if (!canSubmit.value) {
            submitError.value = t('tickets.contactFormInvalid');
            return;
        }

        isSubmitting.value = true;
        const baseBody: PrivTicketCreationBody = {
            topic: formState.topic.trim(),
            content: formState.content.trim(),
        };
        if (attachedFiles.value.length > 0) {
            baseBody.context = attachedFiles.value.map(f => ({
                name: f.mimeCategory.toLowerCase(),
                value: `file_${f.uniqueName}`,
            } as CustomField));
        }

        try {
            const finalResponse = await nuxtApp.$apiBackendTickets.ticketsModulePrivateCreation(baseBody);
            if (finalResponse.error || !finalResponse.success?.ticketId) {
                submitError.value = resolveErrorMessage(finalResponse.error || { message: 'contactCreationFailed' });
                return;
            }

            submitSuccess.value = finalResponse.success;
            formState.topic = '';
            formState.content = '';
            formState.email = '';
            setTimeout(() => {
              submitSuccess.value = null;
              onCancel();
            }, 5000);
        } catch (error: any) {
            submitError.value = resolveErrorMessage(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    const onCancel = () => {
      formState.topic = '';
      formState.content = '';
      formState.email = '';
      nuxtApp.callHook("ticketmng:close" as any);
    }

    // --------------------------------------------------------------------
    // Editor Toolbar
    // --------------------------------------------------------------------
    const customHandlers = {      
    } satisfies EditorCustomHandlers

    const fixedToolbarItems = [
      [{
        kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } }, {
        kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } 
      }], [{
        kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } }, {
        kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } }, {
        kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } }, {
        kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } }, {
      }], [{
        kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }, {
        kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' }
      }], [{
        icon: 'i-lucide-align-justify', tooltip: { text: 'Text Align' }, content: { align: 'end' },
          items: [{
            kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left', label: 'Align Left' }, {
            kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center', label: 'Align Center' }, {
            kind: 'textAlign', align: 'right', icon: 'i-lucide-align-right', label: 'Align Right' }, {
            kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: 'Align Justify'
          }]
      }], [{
        icon: 'i-lucide-heading', tooltip: { text: 'Headings' }, content: { align: 'start' },
          items: [{
            kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' }, {
            kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' }, {
            kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' }, {
            kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4' 
          }] }, {
        icon: 'i-lucide-list',  tooltip: { text: 'Lists' }, content: { align: 'start'},
          items: [{ 
            kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' }, {
            kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List'
          }] }, {
        kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } }, {
      }]
    ] satisfies EditorToolbarItem<typeof customHandlers>[][]

</script>

<template>
    <div class="flex flex-col gap-4">
       <UForm :state="formState" class="w-full" @submit="() => {}">
          <UFormField
            name="topic"
            :label="$t('tickets.contactTopic')"
            :description="$t('tickets.contactTopicDesc')"
            :error="topicError"
            required
            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2 min-h-16"
          >
            <div class="w-90">
              <div
                class="rounded-md bg-white border"
                :class="topicError
                  ? (topicFocused ? 'border-red-500 ring-1 ring-red-500' : 'border-red-600')
                  : ((topicError === undefined && topicFocused)? 'border-green-500 ring-1 ring-green-500' : 'border-neutral-300' )"
                @focusin="topicFocused = true"
                @focusout="topicFocused = false"
              >
                <UEditor v-model="formState.topic" content-type="markdown" class="w-full min-h-7"/>
              </div>
            </div>
          </UFormField>

          <UFormField
            name="content"
            :label="$t('tickets.contactContent')"
            :description="$t('tickets.contactContentDesc')"
            :error="contentError"
            required
            class="flex flex-col gap-2 mb-2"
          >
            <div
              class="rounded-md bg-white border"
                :class="contentError
                    ? (contentFocused ? 'border-red-500 ring-1 ring-red-500' : 'border-red-600')
                    : ((contentError === undefined && contentFocused)? 'border-green-500 ring-1 ring-green-500' : 'border-neutral-300' )"
                @focusin="contentFocused = true"
                @focusout="contentFocused = false"
              >
              <UEditor v-model="formState.content" content-type="markdown" class="w-full rounded-md bg-white"
                ref="contentRef"
                :extensions="[
                  TextAlign.configure({ types: ['heading', 'paragraph'] }),
                ]"
                v-slot="{ editor, handlers }"
                :ui="{ base: 'min-h-40' }"
              >
                  <UEditorToolbar :editor="editor" :items="fixedToolbarItems" 
                    class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-default overflow-x-auto rounded-md flex justify-center">
                  </UEditorToolbar>
              </UEditor>
            </div>
            <div class="flex justify-end mt-2">
              <UButton
                :label="$t('tickets.attachFile')"
                color="neutral"
                variant="soft"
                type="button"
                icon="i-lucide-paperclip"
                size="xs"
                class="mr-auto"
                @click="showAttachModal = true"
              />
              <UButton
                :label="$t('tickets.ticketCancel')"
                color="neutral"
                type="button"
                @click="onCancel"
                icon="i-lucide-square-x"
                class="px-4 mr-2"
              />
              <UButton
                :label="$t('tickets.ticketCreateNew')"
                :disabled="!canSubmit"
                color="neutral"
                type="submit"
                @click="onSubmit"
                icon="i-lucide-square-pen"
                class="px-4"
              />
            </div>

            <!-- Attachment list -->
            <div v-if="attachedFiles.length > 0" class="mt-3 flex flex-col gap-2">
              <span class="text-xs font-semibold text-muted uppercase tracking-wide">{{ $t('tickets.attachments') }}</span>
              <div v-for="(file, idx) in attachedFiles" :key="file.uniqueName"
                   class="flex items-center gap-2 rounded-md border border-accented bg-default px-3 py-2">
                <!-- Thumbnail for images -->
                <img v-if="file.mimeCategory === 'IMAGE' && file.thumbnailUniqueName"
                     :src="getAttachmentThumbnailUrl(file)"
                     class="w-8 h-8 object-cover rounded shrink-0"
                     :alt="file.originalName"
                />
                <UIcon v-else name="i-lucide-file" class="w-5 h-5 shrink-0 text-muted" />
                <span class="truncate text-sm flex-1 min-w-0">{{ file.originalName }}</span>
                <!-- Copy Markdown link (images only) -->
                <UButton v-if="file.mimeCategory === 'IMAGE'"
                  icon="i-lucide-image"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :aria-label="$t('tickets.attachCopyMarkdown')"
                  :title="$t('tickets.attachCopyMarkdown')"
                  @click="onCopyAttachmentMarkdown(file)"
                />
                <!-- Remove -->
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="error"
                  :aria-label="$t('tickets.attachRemove')"
                  @click="onRemoveAttachment(idx)"
                />
              </div>
            </div>
          </UFormField>

          <div v-if="submitError" id="ticketsContactErrorMessage" class="text-lg text-red-600 mt-2 text-right">
            {{ submitError }}
          </div>
          <div v-if="submitSuccess" id="ticketsContactSuccessMessage" 
               class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center z-60">
            <div class="flex flex-col items-center gap-4">
              <div class="mb-2 text-lg text-center text-emerald-600 font-bold">
                {{ $t('tickets.contactSuccess', { ticketId: submitSuccess.ticketId }) }}
              </div>
            </div>
          </div>
        </UForm>

        <!-- File attachment modal -->
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
    </div>
</template>

<style>
.ProseMirror {
    padding: 1px 10px 1px 10px;
}
</style>
