<script setup lang="ts">
   import { ref, computed, reactive } from 'vue';
   import { type UserApiTokenCreationBody } from '~/types';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'apiKeyConfiguration' }});

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const { $formatDuration } = useNuxtApp();

    const componentCtx = reactive({
        creationMode: true as boolean,
        duration: 0 as number,
        durationString: "" as string,
        newApiKey: {
            keyName : "",
            expiration: 0,
            roles: [],
            acls: [],
        } as UserApiTokenCreationBody,
    });

    // Converts a value (1–100) into a duration between 1 hour and 10 years (in seconds)
    // using an exponential progression for smoother scaling
    function mapValueToDuration(value: number): number {
        // Clamp value between 1 and 100
        const x = Math.min(Math.max(value, 1), 100)

        const min = 3600            // 1 hour in seconds
        const max = 315360000       // 10 years in seconds

        // Exponential interpolation
        const exponent = 5          // Controls steepness of curve (adjustable)
        const ratio = (x - 1) / 99  // Normalized value 0 → 1
        const scaled = Math.pow(ratio, exponent)

        return min + (max - min) * scaled
    }

    const onChangeDuration = () => {
        componentCtx.newApiKey.expiration = Math.floor(mapValueToDuration(componentCtx.duration));
        console.log(componentCtx.newApiKey.expiration);
        componentCtx.durationString = $formatDuration(componentCtx.newApiKey.expiration);
        console.log(componentCtx.durationString);
    }

</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">

    <UPageCard
      :title="$t('apiKeys.gen_title')"
      :description="$t('apiKeys.gen_description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="$t('apiKeys.create')"
        :disabled="componentCtx.creationMode"
        icon="i-lucide-plus"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
        @click="componentCtx.creationMode = true"
      />
    </UPageCard>

    <UCard 
      class="w-full max-w-3xl mx-auto"
      variant="subtle"
    >
        <template #header>
            <span class="font-bold">{{ t('apiKeys.existingKeys') }}</span>
        </template>
        <template #default>
            api keys configuration page
        </template>
    </UCard>

    <UCard 
       v-if="componentCtx.creationMode" 
       class="w-full max-w-3xl mx-auto"
       variant="subtle"
    >
        <template #header>
            <span class="font-bold">{{ t('apiKeys.createKey') }}</span>
        </template>
        <template #default>
            <UForm
                id="settings"
                :state="componentCtx.newApiKey"
                @submit="() => {}"
            >
                <UFormField
                    name="keyName"
                    :label="$t('apiKeys.keyName')"
                    :description="$t('apiKeys.keyNameDesc')"
                    required
                    class="flex max-sm:flex-col justify-between items-start gap-4"
                >
                    <UInput v-model="componentCtx.newApiKey.keyName" type="text" class="w-70" />
                </UFormField>

                <UFormField
                    name="expiration"
                    :label="$t('apiKeys.expiration')"
                    :description="$t('apiKeys.expirationDesc')"
                    required
                    class="flex max-sm:flex-col justify-between items-start gap-4 mt-2"
                >
                    <USlider v-model="componentCtx.duration" :min="1" :max="100" class="w-70 mb-2" @change="onChangeDuration()" />
                    <span>{{ componentCtx.durationString }}</span>
                </UFormField>


            </UForm>
        </template>
    </UCard>
    </div>

</template>