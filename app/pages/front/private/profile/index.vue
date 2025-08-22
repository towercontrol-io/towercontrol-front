<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import type { FormSubmitEvent } from '@nuxt/ui'
    import type { UserBasicProfileResponse } from '~/types';
    import type { ActionResult, PhoneNumberInputState } from '~/types';

    const { t, setLocale } = useI18n();
    const appStore = applicationStore();
    const nuxtApp = useNuxtApp();

    const errorStr = reactive({
        value : null as string | null
    });

    const saveSuccess = ref(false);

    const stateMobileNumber = ref({
        countryCode: undefined,
        isValid: false,
        isPossible: false,
        countryCallingCode: undefined,
        nationalNumber: undefined,
        e164: undefined,
        phoneNumber: undefined,
    } as PhoneNumberInputState );

    const profile = reactive({
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        language: undefined,
        mobileNumber: undefined,
        countryCode: undefined,
    }) as {
        firstName: string | undefined;
        lastName: string | undefined;
        email: string | undefined;
        language: string | undefined;
        mobileNumber: string | undefined;
        countryCode: string | undefined;
    };

    const locales = ref([
        { label: 'Auto', id: 'auto', icon: 'i-lucide-earth' },
        { label: 'English', id: 'en', icon: 'flagpack:us' },
        { label: 'Français', id: 'fr', icon: 'flagpack:fr' }
    ]);

  // ----
  // Load the profile data (from cache most of the time, but auto-refresh that way)
  const { $apiBackendUsers } = useNuxtApp();
  let { data: userProfile, profileLoadPending, profileLoadError, profileRefresh } = useAsyncData<UserBasicProfileResponse>(
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
      profile.mobileNumber = _profile.mobileNumber;
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

        const result = ref<ActionResult | null>(null)
        result.value = null
        errorStr.value = null;


        if ( stateMobileNumber.value.isValid ) {
            profile.mobileNumber = stateMobileNumber.value.e164;
            profile.countryCode = stateMobileNumber.value.countryCode;
        } else {
            profile.mobileNumber = undefined;
            profile.countryCode = undefined;
        }
        if ( !stateMobileNumber.value.isValid && ( stateMobileNumber.value.nationalNumber && stateMobileNumber.value.nationalNumber !== '') ) {
            // Invalid phone number, return an error
            errorStr.value = t('profile.gen_invalidPhoneNumber');
            return;
        }


        if ( appStore.getUserLogin() == null ) {
            errorStr.value = t('profile.error_notLoggedIn');
            return;
        }
        const res = await $apiBackendUsers.putUserProfileBasicRequest(
            appStore.getUserLogin() || '',
            profile.firstName || '',
            profile.lastName || '',
            profile.mobileNumber || '',
            profile.countryCode || '',
            (profile.language == 'auto')?'': profile.language || ''
        );
        if (res.success) {
            // Display a success message for 5 seconds
            saveSuccess.value = true;
            setTimeout(() => {
                saveSuccess.value = false;
            }, 5000); // hide success message after 5 seconds

            // Refresh the profile data
            const p = await $apiBackendUsers.getUserProfile();
            userProfile.value = p;
            await nuxtApp.callHook('profile:refresh', true);

        } else if (res.error) {
            errorStr.value = t('login.'+res.error.message);
        }
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
          disabled class="w-70"
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
          autocomplete="off" class="w-70"
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
          autocomplete="off" class="w-70"
        />
      </UFormField>
      <USeparator />

      <UFormField
        name="mobileNumber"
        :label="$t('profile.gen_mobileNumber')"
        :description="$t('profile.gen_mobileNumberDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <ToolsPhoneNumberInput class="w-70" v-model="stateMobileNumber" :e164="userProfile?.mobileNumber" :isoCountry="userProfile?.isoCountryCode" />
      </UFormField>
      <USeparator />


      <UFormField
        name="language"
        :label="$t('profile.gen_language')"
        :description="$t('profile.gen_languageDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
       <USelectMenu v-model="profile.language" value-key="id" :items="locales" class="w-70" @change="applyLocale"/>
      </UFormField>

    </UPageCard>
  </UForm>
    <UPageCard
      v-if="saveSuccess"
      :title="$t('profile.gen_saveSuccess')"
      variant="outline"
      highlight
      highlight-color="success"
      class="mb-4"
    >
    </UPageCard>
    <UPageCard
      v-if="errorStr.value!== null"
      :title="$t('profile.gen_saveError')"
      :description="errorStr.value"
      variant="outline"
      highlight
      highlight-color="error"
      class="mb-4"
    >
    </UPageCard>

</template>
    