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
    const config = useRuntimeConfig()

    const eulaLink : string = config.public.EULA_LINK as string;

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const errorStr = reactive({
        value : null as string | null
    });

    const eulaAccepted = reactive({
        value : false as boolean
    });

    // -----
    // Login function
    async function onAcceptEula() {
        
        const result = ref<UserLoginResponse | null>(null)
        const loginError = ref<ActionResult | { message: string } | null>(null)
        result.value = null
        loginError.value = null

        const res = await $apiBackendUsers.putUserProfileEula();
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
                } else if (res.success.passwordExpired) {
                    // Redirect to the password expired page
                    router.push('/front/private/password-expired');
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
                {{ t('login.eulaAcceptMessage') }} 
                <a :href="eulaLink" target="_blank" style="text-decoration: underline;">{{ t('login.eulaLink') }}</a>
            </p>
        </template>
        <USwitch required v-model="eulaAccepted.value" :label="t('login.eulaAcceptSwitch')" />

        <template #footer v-if="eulaAccepted.value">
            <UButton color="primary" @click="onAcceptEula">
                {{ $t('login.eulaAcceptButton') }}
            </UButton>

            <div v-if="errorStr.value" class="flex flex-col items-center" style="margin-top:1rem;">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ $t("login."+errorStr.value)}} 
                </h2>
            </div>
        </template>

    </UCard>
</template>