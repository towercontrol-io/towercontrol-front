<script setup lang="ts">
    import { reactive } from 'vue';
    import type { FormError } from '@nuxt/ui'
    import type { UserConfigResponse } from '~/types';
    import type { InputPasswordFields } from '~/types/compInputPassword';
    import type { ActionResult } from '~/types';
    import { useRouter } from 'vue-router';


    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const config = useRuntimeConfig()
    const logoImage : string = config.public.LOGO_MAIN as string;
    const serviceName : string = config.public.SERVICE_NAME as string;
    const eulaLink : string = config.public.EULA_LINK as string;

    const router = useRouter();
    const route = useRoute()

    // Extract verificationKey as string (can be from query or param)
    const verificationKey = computed(() => route.query.verificationKey as string | undefined)
    if ( !verificationKey.value ) {
        let _error = encodeURIComponent(JSON.stringify({ message: t('users.verificationKeyMissing') }));
        router.push('/front/public/error?error='+ _error);
    }

    
    const register = reactive({
        email: '' as string,
        password: {
            password: '',
            confirmed: false,
            valid: false
        } as InputPasswordFields,
        conditions : false as boolean,

        disableButton : true as boolean,
        displayMessage : false as boolean,
        success : false as boolean
    });

    // -----
    // Load the useer module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    const errorStr = reactive({
        value : null as string | null
    });


    // -----
    // Validate the form
    const validate = (state: any): FormError[] => {
        const errors = [];
        
        //if (register.email.length < 4) errors.push({ name: 'email', message: $t('login.emailSize') });
        //if (!register.email.includes('@') ) errors.push({ name: 'email', message: $t('login.emailInvalid') });
        register.disableButton = !(errors.length == 0 );
        return errors;
    }

    // -----
    // Call backend
    async function onSubmitPasswordChange() {

        const result = ref<ActionResult | null>(null)
        result.value = null
        errorStr.value = null;
        if ( !verificationKey.value ) errorStr.value = "You must have a validation key;"
        else {

            const res = await $apiBackendUsers.putUserPasswordResetRequest(register.password.password, verificationKey.value );
            if (res.success) {
                register.success = true;
                setTimeout(() => {
                    router.push('/front/public/login');
                }, 10000); // go to login page after 10 seconds
            } else if (res.error) {
                errorStr.value = res.error.message;
            }
        }
       
    }

</script>

<template>
    <UCard variant="outline" align="center" style="border-radius: 1.5rem;padding: 1rem;min-width:25rem;">
        <template #header>
            <div class="flex flex-col items-center space-y-2">
                <img :src="logoImage" alt="Service Logo" class="h-16 w-auto sm:h-20 md:h-24" />
                <h2 class="text-xl font-semibold text-center text-neutral" >
                    {{serviceName}} 
                </h2>
            </div>
        </template>

        <div v-if="pending">
            {{ t('login.loading') }}
            <UProgress animation="swing" />
        </div>

        <div v-if="!pending && error">
            {{ t('login.unavailable') }}
        </div>

        <div v-if="!pending && !error && !register.success">
            <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                {{ t('users.passwordChangeMessage') }}
            </p>

            <UForm
                :state="register"
                :validate="validate"
                @submit="onSubmitPasswordChange"
                class="space-y-1"
            >
                <ToolsInputPassword v-model="register.password" />
                <UButton 
                        type="submit" 
                        color="primary" 
                        block
                        style="margin-top:0.3rem;margin-bottom:0.3rem;"
                        :disabled="!register.password.confirmed || !register.password.valid"
                    >
                        {{ t('users.passwordChange') }}
                </UButton>
            </UForm>
        </div>

        <div v-if="!pending && !error && register.success">
            <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                {{ t('users.passwordChangeSuccess') }}
                {{ t('users.successRedirectMessage') }}
            </p>
        </div>

        <template #footer v-if="errorStr.value!== null">
            <div class="flex flex-col items-center space-y-2">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ t("login."+errorStr.value)}}
                </h2>
            </div>
        </template>

    </UCard>
</template>