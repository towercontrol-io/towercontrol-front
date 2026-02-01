<script lang="ts" setup>

    import type { PrivTicketUserDetailResponseItf, PrivTicketAbstractResponseItf,PrivTicketUserMessageBody } from '~/types';
    import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
    import { TextAlign } from '@tiptap/extension-text-align'

    const props = defineProps<{
            ticket : PrivTicketAbstractResponseItf;
            isAdmin ?: boolean;
    }>();

    const { t } = useI18n();
    const { $formatDuration } = useNuxtApp();
    const toast = useToast();

    const componentCtx = reactive({
        creationMode: false,
        ticketLoading: false as boolean,
        ticketLoadingError: null as string | null,
        ticket: {} as PrivTicketUserDetailResponseItf,
        submitError: null as string | null,
        response: {} as PrivTicketUserMessageBody,
        formState: {} as any
    });

    // --------------------------------------------------------------------
    // Get Ticket Details
    // --------------------------------------------------------------------
    
    const loadTicket = async () => {
        componentCtx.ticketLoading = true;
        componentCtx.ticketLoadingError = null;
        useNuxtApp().$apiBackendTickets.ticketsModulePrivateOneTicket(props.ticket.id).then((res) => {
            if (res.success) {
                componentCtx.ticket = res.success;
                useNuxtApp().callHook("ticketcontent:open" as any, props.ticket.id);
            } else if (res.error) {
                componentCtx.ticketLoadingError = t('tickets.'+res.error.message);
            }
        }).catch((error) => {
            componentCtx.ticketLoadingError = t('common.unknownError');
        }).finally(() => {
            componentCtx.ticketLoading = false;
        });
    };

    onMounted(() => {
        loadTicket();
    });

    // --------------------------------------------------------------------
    // Add a response
    // --------------------------------------------------------------------

    const topicError = computed(() => {
        const trimmed = (componentCtx.response.content || '').trim();
        componentCtx.response.content = trimmed;
        if ( trimmed && trimmed.length > 0) {
          if (trimmed.length < 20) {
              return t('tickets.contactContentRequired');
          }
          return undefined;
        }
        return true;
    });

    /**
     * Process the ticket response submission
     * @param close
     */
    const processTicketResponse = (close : boolean) => {

      componentCtx.submitError = null;
      if (!canSubmit.value && !close) {
          componentCtx.submitError = t('tickets.contactFormInvalid');
          onError();
          return;
      }
      isSubmitting.value = true;
      componentCtx.response.closeTicket = close;
      componentCtx.response.id = props.ticket.id;
      componentCtx.response.closeKb = false;
      componentCtx.response.adminContent = '';
      componentCtx.response.AuthKey = '';

      useNuxtApp().$apiBackendTickets.ticketsModulePrivateUpdate(componentCtx.response).then((res) => {
          if (res.success) {
              componentCtx.response = {} as PrivTicketUserMessageBody;
              loadTicket();
              if ( close ) useNuxtApp().callHook("ticketcontent:close" as any); 
              // Handle successful API key deletion
              toast.add({
                title: t('tickets.responseAddedSuccessfully'),
                description: t('tickets.responseAddedSuccessfullyDesc'),
                icon: 'i-lucide-arrow-big-up-dash',
              });
          } else if (res.error) {
              componentCtx.submitError = t('tickets.'+res.error.message);
              onError();
          }
      }).catch((error) => {
          console.error(error);
          componentCtx.submitError = t('common.unknownError');
          onError();
      }).finally(() => {
          isSubmitting.value = false;
      });

    };

    const onError = () => {
      setTimeout(() => {
        componentCtx.submitError = null;
      }, 5000);
    };

    const onClose = async () => {
        processTicketResponse(true);
    };

    const onSubmit = async () => {
      processTicketResponse(false);
    };

    const onSupportEdit = async () => {
      useRouter().push({ path: `/front/private/support/ticket/${props.ticket.id}/` });
    };

    const isSubmitting = ref(false);
    const canSubmit = computed(() => !topicError.value && !isSubmitting.value);

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
  <div class="bg-white dark:bg-gray-800 p-4 rounded-md border border-accented">
    <MDC v-if="componentCtx.ticket.content" :value="componentCtx.ticket.content" class="[&_*]:!my-0"/>
  </div>
  <div v-for="message in componentCtx.ticket.responses" :key="message.id" class="mt-4 ml-4 border-l-4 border-accented border-r-1 border-b-1  text-black dark:text-white">
    <div v-if="message.fromUser == true"  class="bg-white dark:bg-gray-800 pl-4">
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('tickets.youFrom',{ timeAgo : $formatDuration((Date.now() - message.creationMs) / 1000)}) }}</span>
      <MDC :value="message.content" class="[&_*]:!my-0"/> 
    </div>
    <div v-else class="bg-sky-100 dark:bg-gray-700 pl-4">
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('tickets.supportFrom',{ timeAgo : $formatDuration((Date.now() - message.creationMs) / 1000)}) }}</span>
      <MDC :value="message.content" class="[&_*]:!my-0"/>
    </div>
  </div>
  <div v-if="ticket.status == 'OPEN' || isAdmin"
       class="mt-4 ml-4 border-l-4 border-accented border-r-1 border-b-1 border-l-sky-200 dark:border-l-sky-800 text-black dark:text-white pl-4">
    <UForm :state="componentCtx.formState" class="w-full" @submit="() => {}">   
      <UFormField
            name="responseContent"
            :label="$t('tickets.responseContentLabel')"
            :description="$t('tickets.responseContentDescription')"
            :error="topicError"
            required
            class="flex flex-col gap-2 mb-2"
          >
            <div class="w-full">
              <div
                class="bg-white dark:bg-gray-800 w-full pr-4"
              >
               <UEditor v-model="componentCtx.response.content" content-type="markdown" class="w-full bg-white dark:bg-gray-800"
                ref="contentRef"
                :extensions="[
                  TextAlign.configure({ types: ['heading', 'paragraph'] }),
                ]"
                v-slot="{ editor, handlers }"
                :ui="{ base: 'min-h-40' }"
              >
                  <UEditorToolbar :editor="editor" :items="fixedToolbarItems" 
                    class="border-b border-muted sticky top-0 inset-x-0 py-2 z-50 bg-gray-100 dark:bg-gray-700 overflow-x-auto rounded-md flex justify-center">
                  </UEditorToolbar>
              </UEditor>
              </div>
            </div>
            <div class="flex justify-end mt-2 mr-1">
              <UButton
                :label="$t('tickets.closeOnly')"
                color="neutral"
                type="submit"
                @click="onClose"
                icon="i-lucide-square-x"
                class="px-2"
                size="xs"
              />
              <UButton
                :label="$t('tickets.responseAdd')"
                :disabled="!canSubmit"
                color="neutral"
                type="submit"
                @click="onSubmit"
                icon="i-lucide-square-plus"
                class="px-2 ml-1"
                size="xs"
              />
              <UButton
                :label="$t('tickets.responseClose')"
                :disabled="!canSubmit"
                color="neutral"
                type="submit"
                @click="onClose"
                icon="i-lucide-square-x"
                class="px-2 ml-1"
                size="xs"
              />
              <UButton
                v-if="isAdmin"
                :label="$t('tickets.supportEdit')"
                color="success"
                type="submit"
                @click="onSupportEdit"
                icon="i-lucide-square-pen"
                class="px-2 ml-1"
                size="xs"
              />
            </div>
      </UFormField>
      <div v-if="componentCtx.submitError" class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center z-60">
        <div class="flex flex-col items-center gap-4">
          <div class="mb-2 text-lg text-center text-error-600 font-bold">
            {{ componentCtx.submitError }}
          </div>
        </div>
      </div>
    </UForm>      
  </div>
</template>


<style>

</style>