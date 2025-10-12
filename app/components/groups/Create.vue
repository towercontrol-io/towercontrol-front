<script setup lang="ts">
   import { ref, computed } from 'vue';
   import * as v from 'valibot'
   import type { FormSubmitEvent } from '@nuxt/ui'
import { error } from '#build/ui';

   type Schema = v.InferOutput<typeof schema>

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const { $apiBackendGroups } = useNuxtApp();

   const props = defineProps({ 
      parentId: { type: String, required: true, default: '' },
   });

   const group = reactive({
      name: '' as string,
      description: '' as string,
      parentId: (props.parentId != '') ? props.parentId : null as string | null,
      disableCreation: false as boolean,
      successString: null as string | null,
      errorString: null as string | null,
   });

    const schema = v.object({
        name: v.pipe(v.string(), v.minLength(2, 'Too short'), v.maxLength(100, 'Too long')),
        description: v.pipe(v.string(), v.minLength(8, 'Too short'), v.maxLength(256, 'Too long')),
    });

   const onGroupsCreate = () => {
      if (group.name.trim() === '' || group.description.trim() === '') {
        return;
      }
      group.disableCreation = true;
      group.errorString = null;
      group.successString = null;
      $apiBackendGroups.groupModulePostGroupsCreation(group.name, group.description, group.parentId).then((res) => {
         if (res.success) {
            // refresh the group list
            nuxtApp.callHook("usermng:groupUpdate" as any);
            group.name = '';
            group.description = '';
            group.disableCreation = false;
            group.successString = t('groups.createSuccess');
            setTimeout(() => {
                group.successString = null;
            }, 5000); // hide success message after 5 seconds
        } else if (res.error) {
            group.errorString = t('groups.' + res.error.message);
            setTimeout(() => {
                group.disableCreation = false;
            }, 5000); // reactivate creation after 5 seconds
         }
      }).catch((err) => {
         group.errorString = t('groups.' + err.message);
         setTimeout(() => {
            group.disableCreation = false;
         }, 5000); // reactivate creation after 5 seconds
      });
   }


</script>



<template>
    <div class="m-2">
        <UPageCard
        :title="$t('groups.createTitle')"
        :description="$t('groups.createDesc')"
        variant="subtle"
        >
            <UForm :schema="schema" :state="group" class="space-y-4" @submit="onGroupsCreate">
                <UFormField
                    name="name"
                    :label="$t('groups.name')"
                    :description="$t('groups.nameDesc')"
                    class="flex max-sm:flex-col justify-between items-start gap-4"
                >
                    <UInput
                        v-model="group.name"
                        type="text"
                        class="w-90"
                    />
                </UFormField>
                <UFormField
                    name="description"
                    :label="$t('groups.description')"
                    :description="$t('groups.descriptionDesc')"
                    class="flex max-sm:flex-col justify-between items-start gap-4"
                >
                    <UTextarea
                        v-model="group.description"
                        type="text"
                        class="w-90"
                    />
                </UFormField>
                <UButton
                    :label="$t('groups.createAction')"
                    color="neutral"
                    :disabled="group.name.trim() === '' || group.description.trim() === ''"
                    @click="onGroupsCreate"
                    class="w-fit lg:ms-auto w-90 justify-center text-center"
                />
                </UForm>
        </UPageCard>
        <UPageCard
            v-if="group.successString !== null"
            :title="group.successString"
            variant="outline"
            highlight
            highlight-color="success"
            class="mb-4"
        />
        <UPageCard
            v-if="group.errorString!== null"
            :title="$t('groups.gen_createError')"
            :description="group.errorString"
            variant="outline"
            highlight
            highlight-color="error"
            class="mb-4"
        />

    </div>    
</template>