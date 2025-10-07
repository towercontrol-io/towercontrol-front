<script setup lang="ts">
    import { reactive } from 'vue';
    import type { InputPasswordFields } from '~/types/compInputPassword';
    import type { RadioGroupItem, RadioGroupValue } from '@nuxt/ui';
    import { type ActionResult, type UserConfigResponse, type UserBasicProfileResponse, TwoFATypes } from '~/types';
    import QrcodeVue from 'qrcode.vue';

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const config = useRuntimeConfig();
    const appStore = applicationStore();


    const enable2Fa : boolean = config.public.ENABLE_2FA as boolean;

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );
      
    let { data: userProfile, profileLoadPending, profileLoadError, profileRefresh } = useAsyncData<UserBasicProfileResponse>(
        () => `user-profile-response`,
        () => $apiBackendUsers.getUserProfile()
    );


    const successStr = reactive({
        value : null as string | null
    });
    const errorStr = reactive({
        value : null as string | null
    });

    const password = reactive({
        password: {
            password: '',
            confirmed: false,
            valid: false
        } as InputPasswordFields,
    });

    async function onChangePassword() {
        errorStr.value = null;

        const res = await $apiBackendUsers.putUserProfilePasswordChange(password.password.password);
        if (res.success) {
            successStr.value = t('profile.sec_savePassSuccess');
            setTimeout(() => {
                successStr.value = null;
            }, 5000); // hide success message after 5 seconds
        } else if (res.error) {
            errorStr.value = res.error.message;
        }
    }

    // ---------------------------------------------------
    // 2FA configuration
    // ---------------------------------------------------
    const twoFaItems = ref<RadioGroupItem[]>([
        { value: TwoFATypes.AUTHENTICATOR, label: t('profile.sec_2fa_authentictor') },
        { value: TwoFATypes.EMAIL, label: t('profile.sec_2fa_email') },
        { value: TwoFATypes.SMS, label: t('profile.sec_2fa_sms'), disabled: true }
    ]);

    const twoFa = reactive({
        twoFa: {
            enable: false,
            type: TwoFATypes.NONE,
            verify: false,
            secret: undefined,
            verifyCode : [],
        } as {
            enable: boolean,
            type: TwoFATypes,
            verify: boolean,
            secret: string | undefined,
            verifyCode: [],
        },
    });

    watch(userProfile, (_profile) => {
        if (_profile) {
            twoFa.twoFa.enable = (_profile.twoFAConfig != TwoFATypes.NONE || false);
            if ( twoFa.twoFa.enable ) {
                twoFa.twoFa.type = _profile.twoFAConfig || TwoFATypes.NONE;
            } else {
                twoFa.twoFa.type = TwoFATypes.NONE; // Reset the type if 2FA is disabled
            }
        }
    }, { immediate: true });


    /**
     * Restrict the 2FA change application to the effective configuration change.
     */
    const canApply2FA = computed(() => {
      if ( ! userProfile || ! userProfile.value ) {
        return false; // User profile is not loaded yet
      } 
      // Make sure the configuration has changed  
      return (   (twoFa.twoFa.enable && (userProfile.value?.twoFAConfig === TwoFATypes.NONE) && twoFa.twoFa.type !== TwoFATypes.NONE )
              || (!twoFa.twoFa.enable && (userProfile.value?.twoFAConfig != TwoFATypes.NONE) )
              || (twoFa.twoFa.enable && (userProfile.value?.twoFAConfig !== TwoFATypes.NONE) && twoFa.twoFa.type !== userProfile.value?.twoFAConfig)
             );
    });

    /**
     * First phase for the activation, the user needs to validate a 2FA code / authentication
     * before applying activation.
     */
    async function onChange2Fa() {
        errorStr.value = null;

        if ( !twoFa.twoFa.enable ) {
            twoFa.twoFa.type = TwoFATypes.NONE; // Reset the type if 2FA is disabled
        }

        const res = await $apiBackendUsers.putUserProfile2FaChangeRequest(twoFa.twoFa.type);
        if (res.success) {
            successStr.value = t('profile.sec_change2FASuccess');
            if ( res.success.twoFaType === TwoFATypes.AUTHENTICATOR ) {
                twoFa.twoFa.verify = true; // Set the verification flag to true for diplaying next step
                twoFa.twoFa.secret = res.success.secret; // Store the secret for later verification
            } else {
                twoFa.twoFa.verify = false; // No verification needed for EMAIL or SMS or NONE
                twoFa.twoFa.secret = undefined; // No secret needed for EMAIL or SMS or NONE
            }
            if ( userProfile && userProfile.value ) {
                userProfile.value.twoFAConfig = res.success.twoFaType; // make sur it is updated until next refresh
            } 
            setTimeout(() => {
                successStr.value = null;
            }, 5000); // hide success message after 5 seconds
        } else if (res.error) {
            errorStr.value = t('login.' + res.error.message);
        }

    }

    /**
     * Submit the 2FA code for verification
     */
    async function onSubmit2Fa() {
        errorStr.value = null;
        let code = twoFa.twoFa.verifyCode.join('');
        twoFa.twoFa.verifyCode = []; // Reset the code input after submission

        const res = await $apiBackendUsers.getUserProfile2FaVerificationRequest(code);
        if (res.success) {
            successStr.value = t('profile.sec_verify2FASuccess');
            setTimeout(() => {
                successStr.value = null;
            }, 10000); // hide success message after 5 seconds
        } else if (res.error) {
            errorStr.value = t('profile.sec_verify2FAFailed');
        }

    }



</script>

<template>
    <UForm
    id="passChangeForm"
    :state="password"
    @submit="onChangePassword"
  >
    <UPageCard
      :title="$t('profile.sec_title')"
      :description="$t('profile.sec_description')"
      variant="naked"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <ToolsInputPassword v-model="password.password" />
      <UButton
        form="passChangeForm"
        :label="$t('profile.sec_savePassword')"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />

    </UPageCard>
  </UForm>

  <UPageCard v-if="successStr.value !== null"
      :title="$t('profile.sec_saveSuccess')"
      :description="successStr.value"
      variant="outline"
      highlight
      highlight-color="success"
      class="w-full"
  />
  <UPageCard v-if="errorStr.value!== null"
      :title="$t('profile.gen_saveError')"
      :description="errorStr.value"
      variant="outline"
      highlight
      highlight-color="error"
      class="mb-4"
  />


  <UForm v-if="enable2Fa"
    id="twoFaForm"
    :state="twoFa"
    @submit="onChange2Fa"
  >
    <UPageCard
      :description="$t('profile.sec_2faDesc')"
      variant="naked"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <USwitch 
        v-model="twoFa.twoFa.enable" 
        :label="$t('profile.sec_2faEnable')"
        color="neutral"
      />
      <URadioGroup v-if="twoFa.twoFa.enable" 
         v-model="twoFa.twoFa.type" 
         :items="twoFaItems" 
         style="margin-left:1rem;"
      />

      <UButton
        form="twoFaForm"
        :label="$t('profile.sec_2fa_apply')"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
        :disabled="!canApply2FA"
      />

      <div v-if="twoFa.twoFa.verify" class="flex max-sm:flex-col justify-between items-start gap-4">
        <QrcodeVue
            :value="twoFa.twoFa.secret"
            :size="150"
            level="M"
            class="rounded-lg"
        />
        <div class="flex flex-col w-full">
            {{ t('profile.sec_2fa_verify') }}
            <span class="text-sm text-success mb-2">
                {{ t('profile.sec_2fa_verifyinput') }}
            </span>
            <UPinInput v-model="twoFa.twoFa.verifyCode" length=6 otp size="md" @complete="onSubmit2Fa" />
        </div>
      </div>
    </UPageCard>

  </UForm>



</template>