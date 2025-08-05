<script setup lang="ts">
    import { reactive, onMounted, onBeforeUnmount } from 'vue';
    import type { UserConfigResponse } from '~/types';


    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const config = useRuntimeConfig()
    const logoImage : string = config.public.LOGO_MAIN as string;
    const serviceName : string = config.public.SERVICE_NAME as string;
    const route = useRoute();

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


    /*
    console.log("--------------------------");
    console.log(userConfig.value);
    console.log(userConfig.value?.selfRegistration);
    console.log("--------------------------");
    */

</script>

<template>
    <UCard variant="outline" align="center" style="border-radius: 1.5rem;padding: 1rem;min-width:25rem;">
        <template #header>
            <div class="flex flex-col items-center space-y-2">
                <img :src="logoImage" alt="Service Logo" class="h-16 w-auto sm:h-20 md:h-24" />
                <h2 class="text-xl font-semibold text-gray-700 text-center text-neutral" >
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
                <h2 v-if="true || !pending && !error" class="text-lg text-gray-500">
                    __  {{ userConfig?.selfRegistration }}__
                </h2>

            <div>
                <p class="text-sm text-primary text-center" style="margin-bottom:1rem;">
                    {{ t('login.welcomeMessage') }}
                </p>

                <UForm
                :state="form"
                @submit="onSubmit"
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
        </div>

    </UCard>
<!--
            <b-card align="center" style="border-radius: 1.5rem;padding: 2rem;">
              <b-card-img src="/static/front/logo.svg" 
                          alt="logo" 
                          style="width: 25%; margin: 20px 0px 20px 0px;" 
                          top></b-card-img>
              <b-card-text>
                <h1 class="mb-2">{{ $config.consoleName }}</h1>
              </b-card-text>
              <b-card-text class="small">
                <span style="color: rgb(56,162,255);">
                  {{ $t('welcome_message') }}
                </span>
              </b-card-text>
              <b-card-text class="small">
                <b-icon v-if="(errorMessage.length > 0)" icon="x-circle" variant="danger"></b-icon>
                <span v-if="(errorMessage.length > 0)" class="text-danger">
                  {{ errorMessage }}
                </span>
              </b-card-text>
              <form @submit.prevent="userLogin">
                    <b-form-input v-model="login.username"
                                  type="text" 
                                  :placeholder="$t('username')"
                                  class="mb-1"
                                  ></b-form-input>
                    <b-form-input v-model="login.password"
                                  type="password" 
                                  :placeholder="$t('password')"
                                  class="mb-1"
                                  ></b-form-input>
                    <b-button block 
                              variant="primary" 
                              @click="userLogin()"
                              class="mb-2">
                              {{ $t('submit') }}</b-button>
              </form> 
              <b-button block 
                        v-if="status.openForRegistration"
                        variant="outline-primary"
                        @click="redirectToSignup()"
                        >{{ $t('signup_message') }}</b-button>
              <b-card-text @click="redirectPassLost()" style="text-align:right;">
                <span style="color: rgb(150,50,50);text-decoration: underline;">
                    {{ $t('lost_password')}} 
                </span>
              </b-card-text>
            </b-card>
        -->
</template>