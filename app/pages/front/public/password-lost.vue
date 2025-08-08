<script setup lang="ts">
    import { reactive } from 'vue';
    import type { FormError, FormSubmitEvent } from '@nuxt/ui'
    import type { ActionResult } from '~/types';
    import { useRouter } from 'vue-router';

    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const router = useRouter();

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const errorStr = reactive({
        value : null as string | null
    });


    const email = reactive({
        email : '' as string,
        disableButton : true as boolean,
        displayMessage : false as boolean
    });

    // -----
    // Validate the form
    const validate = (state: any): FormError[] => {
        const errors = [];
        if (email.email.length < 4) errors.push({ name: 'email', message: $t('login.emailSize') });
        if (!email.email.includes('@') ) errors.push({ name: 'email', message: $t('login.emailInvalid') });
        email.disableButton = errors.length > 0;
        return errors;
    }


    // -----
    // Request the password reset
    async function onRequestPasswordReset() {
        
        const result = ref<ActionResult | null>(null)
        result.value = null
        errorStr.value = null;
        email.displayMessage = false;

        const res = await $apiBackendUsers.postUserProfilePasswordLostReq(email.email);
        if (res.success) {
            email.displayMessage = true;
            email.disableButton = true;
            setTimeout(() => {
                router.push('/front/public/login');
            }, 10000); // go to login page after 10 seconds
        } else if (res.error) {
            errorStr.value = res.error.message;
        }
    }

</script>

<template>
    <UCard variant="outline" align="center" style="border-radius: 1.5rem;padding: 1rem;min-width:25rem;">

        <template #header>
            <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                {{ t('login.passwordLostMessage') }} 
            </p>
        </template>

        <UForm :validate="validate" :state="email" class="space-y-4" @submit="onRequestPasswordReset">
            <UFormField :label="$t('login.passwordLostEmail')" name="email" required>
                <UInput v-model="email.email" type="email" class="w-full" />
            </UFormField>

            <UButton type="submit" :disabled="email.disableButton">
                {{ t('login.passwordLostSubmit') }} 
            </UButton>
        </UForm>

        <template #footer v-if="email.displayMessage">
            <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                {{ t('login.passwordLostMessageSent') }} 
            </p>
        </template>

        <template #footer v-if="errorStr.value">
            <div class="flex flex-col items-center">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ $t("login."+errorStr.value)}} 
                </h2>
            </div>
        </template>

    </UCard>
</template>