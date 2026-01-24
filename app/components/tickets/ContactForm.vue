<script setup lang="ts">
    import { computed, reactive, ref } from 'vue';
    import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
    import type { Editor, JSONContent } from '@tiptap/vue-3'
    import { TextAlign } from '@tiptap/extension-text-align'
    import type { PrivTicketCreationBody, PrivTicketCreationResponseItf } from '~/types';
    import type { ActionResult } from '~/types';

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();

    const formState = reactive<PrivTicketCreationBody>({
        topic: '',
        content: '',
        email: '',
    });

    // Email 
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailError = computed(() => {
        if ( formState.email && formState.email.length > 0 ) {
          if (!formState.email?.trim()) {
              return t('tickets.contactEmailRequired');
          }
          if (!emailPattern.test(formState.email.trim())) {
              return t('tickets.contactEmailInvalid');
          }
          return undefined;
        }
        return true;
    }); 

    // Topic
    const topicFocused = ref(false);
    const topicError = computed(() => {
        const trimmed = (formState.topic || '').replace(/\r?\n/g, ' ').trim();
        formState.topic = trimmed;
        //if (!trimmed) {
        //    return t('tickets.contactTopicRequired');
        //}
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

    // ----------------------------------------------------
    // Submission
    // ----------------------------------------------------

    const isSubmitting = ref(false);
    const submitError = ref<string | null>(null);
    const submitSuccess = ref<PrivTicketCreationResponseItf | null>(null);
    const canSubmit = computed(() => !emailError.value && !topicError.value && !contentError.value && !isSubmitting.value);

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
            email: formState.email!.trim(),
        };

        try {
            const firstResponse = await nuxtApp.$apiBackendTickets.ticketsModulePublicCreation(baseBody);
            if (firstResponse.error || !firstResponse.success?.confirmationCode) {
                submitError.value = resolveErrorMessage(firstResponse.error || { message: 'contactConfirmationMissing' });
                return;
            }

            const confirmedBody: PrivTicketCreationBody = {
                ...baseBody,
                confirmationCode: firstResponse.success.confirmationCode,
            };

            const finalResponse = await nuxtApp.$apiBackendTickets.ticketsModulePublicCreation(confirmedBody);
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
            }, 5000);
        } catch (error: any) {
            submitError.value = resolveErrorMessage(error);
        } finally {
            isSubmitting.value = false;
        }
    };

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
            name="email"
            :label="$t('tickets.contactEmail')"
            :description="$t('tickets.contactEmailDesc')"
            :error="emailError"
            required
            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2 min-h-16"
          >
            <UInput v-model="formState.email" type="email" class="w-90" />
          </UFormField>

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
                :label="$t('tickets.contactSend')"
                :disabled="!canSubmit"
                color="neutral"
                type="submit"
                @click="onSubmit"
                icon="i-lucide-send"
                class="px-4"
              />
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
    </div>
</template>

<style>
.ProseMirror {
    padding: 1px 10px 1px 10px;
}
</style>
