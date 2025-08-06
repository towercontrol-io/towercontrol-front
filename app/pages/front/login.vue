<script setup lang="ts">
    import { reactive, onMounted, onBeforeUnmount } from 'vue';
    import type { UserConfigResponse, UserLoginResponse } from '~/types';
    import type { ActionResult } from '~/types';
    import { useRouter } from 'vue-router';


    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const config = useRuntimeConfig()
    const logoImage : string = config.public.LOGO_MAIN as string;
    const serviceName : string = config.public.SERVICE_NAME as string;
    const router = useRouter();

    const form = reactive({
        username: '',
        password: ''
    });

    // -----
    // Load the useer module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    // Add a retry mechanism
    let retryInterval: ReturnType<typeof setInterval> | null = null;
    onMounted(() => {
        retryInterval = setInterval(() => {
            if (error.value) {
            refresh();
            }
        }, 30000); // toutes les 30 secondes
    });

    onBeforeUnmount(() => {
        if (retryInterval) clearInterval(retryInterval);
    });

    const loginErrorStr = reactive({
        value : null as string | null
    });

    // -----
    // Login function
    async function onSubmitLogin() {
        const result = ref<UserLoginResponse | null>(null)
        const loginError = ref<ActionResult | { message: string } | null>(null)
        result.value = null
        loginError.value = null

        const res = await $apiBackendUsers.postUserLogin(form.username, form.password)
        if (res.success) {
            result.value = res.success
            loginErrorStr.value = null;

            // The behavior of the application depends on the result of the login.
            // We may ahve to change login, validate EULA or set a 2FA...
            if (res.success.conditionToValidate) {
                // Redirect to the eula validation page
                router.push('/front/eula');
            } else if (res.success.passwordExpired) {
                // Redirect to the password expired page
                router.push('/front/password-expired');
            } else if (res.success.twoFARequired) {
                // Redirect to the 2FA page
                router.push('/front/login-two-factor');
            } else {
                // Login successful, redirect to the home page
                router.push('/front/home');
            }

        } else if (res.error) {
            loginError.value = res.error
            loginErrorStr.value = res.error.message;
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

        <div v-if="!pending && !error">
            <div>
                <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                    {{ t('login.welcomeMessage') }}
                </p>

                <UForm
                :state="form"
                @submit="onSubmitLogin"
                class="space-y-4"
                >
                    <UFormGroup label="Login" name="username">
                        <UInput 
                        v-model="form.username" 
                        :placeholder="t('login.login')" 
                        class="w-full"
                        style="margin-top:0.3rem;"
                        />
                    </UFormGroup>

                    <UFormGroup label="Password" name="password">
                        <UInput
                            class="w-full"
                            v-model="form.password"
                            type="password"
                            :placeholder="t('login.password')" 
                            style="margin-top:0.3rem;"
                        />
                    </UFormGroup>

                    <UButton 
                        type="submit" 
                        color="primary" 
                        block
                        style="margin-top:0.3rem;margin-bottom:0.3rem;"
                    >
                        {{ t('login.connection') }}
                    </UButton>

                    <UButton 
                        v-if="userConfig?.selfRegistration"
                        type="submit" 
                        color="primary" variant="outline" 
                        block
                        style="margin-bottom:0rem;"
                        @click="router.push('/front/register')"
                    >
                        {{ t('login.register') }}
                    </UButton>
                </UForm>
            </div>
            <div class="w-full flex justify-end mt-2">
                <span class="text-neutral" style="text-decoration: underline;">
                    {{ $t('login.lost_password')}} 
                </span>
            </div>
        </div>

        <template #footer v-if="loginErrorStr.value!== null">
            <div class="flex flex-col items-center space-y-2">
                <h2 class="text-m font-semibold text-center text-error" >
                    {{ $t("login."+loginErrorStr.value)}} 
                </h2>
            </div>
        </template>

    </UCard>
</template>