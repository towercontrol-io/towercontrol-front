<script setup lang="ts">
    import { reactive } from 'vue';
    import { applicationStore } from '~/stores/app';
    import type { UserLoginResponse } from '~/types';
    import type { ActionResult } from '~/types';
    import { useRouter } from 'vue-router';

    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();


    // -----
    // Manage the 2FA code input
    const value = ref([]);
    
    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const errorStr = reactive({
        value : null as string | null
    });

    // -----
    // Login function
    async function onSubmit2Fa() {
        const result = ref<UserLoginResponse | null>(null)
        const loginError = ref<ActionResult | { message: string } | null>(null)
        result.value = null
        loginError.value = null

        const res = await $apiBackendUsers.getUserSessionUpgrade(value.value.join(''));
        if (res.success) {
            result.value = res.success
            errorStr.value = null;

            // The behavior of the application depends on the result of the login.
            // We may ahve to change login, validate EULA or set a 2FA...
            if (res.success.conditionToValidate) {
                // Redirect to the eula validation page
                router.push('/front/private/eula');
            } else if (res.success.passwordExpired) {
                // Redirect to the password expired page
                router.push('/front/private/password-expired');
            } else if (!res.success.twoFAValidated) {
                // The 2FA code was not valid
                errorStr.value = 'twoFaCodeInvalid';
            } else {
                // Login successful, redirect to the home page
                router.push('/front/private/home');
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

        <div>
            <div>
                <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                    {{ t('login.twoFactorMessage-'+appStore.getUser2faType()) }}
                </p>
                <UPinInput v-model="value" :length="appStore.getUser2faSize()" otp size="xl" @complete="onSubmit2Fa" @change="clearErrorStr"/>
            </div>
        </div>

        <template #footer v-if="errorStr.value!== null">
            <div class="flex flex-col items-center space-y-2">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ $t("login."+errorStr.value)}} 
                </h2>
            </div>
        </template>

    </UCard>
</template>