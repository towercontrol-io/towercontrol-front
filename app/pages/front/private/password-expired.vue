<script setup lang="ts">
    import { reactive } from 'vue';
    import type { FormError, FormSubmitEvent } from '@nuxt/ui'
    import { applicationStore } from '~/stores/app';
    import type { UserLoginResponse } from '~/types';
    import type { ActionResult, UserConfigResponse } from '~/types';
    import { useRouter } from 'vue-router';

    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig()

    const eulaLink : string = config.public.EULA_LINK as string;

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    const errorStr = reactive({
        value : null as string | null
    });

    const password = reactive({
        password : '' as string,
        repeat : '' as string,
        disableButton : true as boolean
    });

    // -----
    // Validate the form
    const validate = (state: any): FormError[] => {
        const errors = [];
        if (password.password.length < 8) errors.push({ name: 'password', message: $t('login.passwordSize') });
        if (password.repeat !== password.password) errors.push({ name: 'repeat', message: $t('login.passwordMismatch') });
        password.disableButton = errors.length > 0;
        return errors
    }

    // -----
    // Login function
    async function onChangePassword() {
        const result = ref<UserLoginResponse | null>(null)
        const loginError = ref<ActionResult | { message: string } | null>(null)
        result.value = null
        loginError.value = null

        const res = await $apiBackendUsers.putUserProfilePasswordChange(password.password);
        if (res.success) {
            const res = await $apiBackendUsers.getUserSessionUpgrade('');
            if (res.success) {
                result.value = res.success
                errorStr.value = null;

                // The behavior of the application depends on the result of the login.
                // We may ahve to change login, validate EULA or set a 2FA...
                if (res.success.twoFARequired) {
                    // Redirect to the 2FA page
                    router.push('/front/private/login-two-factor');
                } else if (userConfig.value?.eulaRequired && res.success.conditionToValidate) {
                    // Redirect to the eula validation page
                    router.push('/front/private/accept-eula');
                } else {
                    // Login successful, redirect to the home page
                    router.push('/front/private/home');
                }

            } else if (res.error) {
                errorStr.value = res.error.message;
            }
        } else if (res.error) {
            errorStr.value = res.error.message;
        }
    }

    async function clearErrorStr() {
        errorStr.value = null;
    }

</script>

<template>
    <UCard variant="outline" align="center" style="border-radius: 1.5rem;padding: 1rem;min-width:25rem;">

        <template #header>
            <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                {{ t('login.passwordExpired') }} 
            </p>
        </template>

        <UForm :validate="validate" :state="password" class="space-y-4" @submit="onChangePassword">
            <UFormField :label="$t('login.passwordExpirePass')" name="password" required>
                <UInput v-model="password.password" type="password" class="w-full" />
            </UFormField>
            <UFormField :label="$t('login.passwordExpireRepeat')" name="repeat" required>
                <UInput v-model="password.repeat" type="password" class="w-full" />
            </UFormField>

            <UButton type="submit" :disabled="password.disableButton">
                {{ t('login.passwordChange') }} 
            </UButton>
        </UForm>

        <template #footer v-if="errorStr.value">
            <div class="flex flex-col items-center">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ $t("login."+errorStr.value)}} 
                </h2>
            </div>
        </template>

    </UCard>
</template>