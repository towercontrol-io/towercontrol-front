<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { FormSubmitEvent } from '@nuxt/ui'
    import type { UserBasicProfileResponse } from '~/types';

    const { t, setLocale } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();

    const profile = reactive({
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        language: undefined,
    }) as {
        firstName: string | undefined;
        lastName: string | undefined;
        email: string | undefined;
        language: string | undefined;
    };

    const locales = ref([
        { label: 'Auto', id: 'auto', icon: 'i-lucide-earth' },
        { label: 'English', id: 'en', icon: 'flagpack:us' },
        { label: 'Français', id: 'fr', icon: 'flagpack:fr' }
    ]);

  // ----
  // Load the profile data (from cache most of the time, but auto-refresh that way)
  const { $apiBackendUsers } = useNuxtApp();
  const { data: userProfile, profileLoadPending, profileLoadError, profileRefresh } = useAsyncData<UserBasicProfileResponse>(
    () => `user-profile-response`,
    () => $apiBackendUsers.getUserProfile()
  );

  // ---
  // Apply user Locale if set, or keep browser default locale
  watch(userProfile, (_profile) => {
    if (_profile) {
      profile.firstName = _profile.firstName;
      profile.lastName = _profile.lastName;
      profile.email = _profile.email;
      profile.language = _profile.language || 'auto';
    }
  }, { immediate: true });


  function applyLocale() {
    const selectedLocale = profile.language;
    if (selectedLocale && selectedLocale !== 'auto') {
      switch (selectedLocale) {
        case 'fr': setLocale('fr'); break;
        case 'en': setLocale('en'); break;
      }
    } else {
      // Reset to browser default locale
      // @TODO : restore browser default
      //setLocale();
    }
  }


async function onSubmit(event: FormSubmitEvent<any>) {
  console.log(event.data)
}



</script>

<template>
<UForm
    id="settings"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      :title="$t('profile.gen_title')"
      :description="$t('profile.gen_description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="$t('profile.save')"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="email"
        :label="$t('profile.gen_email')"
        :description="$t('profile.gen_emailDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.email"
          type="email"
          disabled class="w-48"
        />
      </UFormField>
      <USeparator />


      <UFormField
        name="firstName"
        :label="$t('profile.gen_firstName')"
        :description="$t('profile.gen_firstNameDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.firstName"
          autocomplete="off" class="w-48"
        />
      </UFormField>

      <USeparator />

      <UFormField
        name="lastName"
        :label="$t('profile.gen_lastName')"
        :description="$t('profile.gen_lastNameDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.lastName"
          autocomplete="off" class="w-48"
        />
      </UFormField>
      <USeparator />


      <UFormField
        name="language"
        :label="$t('profile.gen_language')"
        :description="$t('profile.gen_languageDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
       <USelectMenu v-model="profile.language" value-key="id" :items="locales" class="w-48" @change="applyLocale"/>
      </UFormField>

    </UPageCard>
  </UForm>

</template>
    