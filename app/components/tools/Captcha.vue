<script setup lang="ts">
    import { type ActionResult, ACTION_RESULT, type UserConfigResponse } from '~/types';
    
    const props = defineProps({ 
      captchaKey: { type: String, required: true, default: '' },
      challengeState: { type: Number, required: true, default: 0 }
    });

    const emit = defineEmits(['update:challengeState']);
    
    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const { t } = useI18n();
    const config = useRuntimeConfig();

    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    const context = reactive({
        holdOn:false as boolean,
        bColor: [] as string[],
        errorMessages: null as string | null,
        successMessage: null as string | null,
    });


    const selectPad = async function (padIndex: number) {
        context.bColor[padIndex] = '#40F040';
        
        // Call server to validate
        context.errorMessages = '';
        context.successMessage = '';

        try {
          const response = await $fetch<ActionResult>(
              config.public.BACKEND_API_BASE+'/common/1.0/captcha/pad/'+padIndex+'/'+props.captchaKey+'/', 
              {
                  method: 'GET',
                  body: null,
                  headers: {
                      'Accept': 'application/json',
                  },
              }
          );
          if ( response ) {
            if ( response.message === 'common-captcha-received' ) {
               // the captcha is validated
               emit('update:challengeState', 1);
            }

          }
        } catch (err: any) {
            if ( err.response.status == 400 ) {
                // the captcha is not verified ... error & reset
                context.bColor = [];
                for ( let i=0; i<16; i++ ) {
                  context.bColor.push( '#000000' );
                }
                context.errorMessages = t('captcha.failed');
                // Clear error after some time
                setTimeout(() => {
                  context.errorMessages = null;
                }, 3000);
            } else {
              context.errorMessages= t('captcha.error');
            }
        }
      }
      
      const getBorder = function(padIndex: number) {
        return context.bColor[padIndex];
      };

      const reset = function() {
          // no direct validation if captcha enabled
          context.holdOn = false;
          context.bColor = [];
          for ( let i=0; i<16; i++ ) {
            context.bColor.push( '#000000' );
          }
          // Just because we want to be sure the captcha is loaded
          setTimeout(() => {
            context.holdOn = true;
          }, 500);
          context.errorMessages = null;
          context.successMessage = null;
      };
      reset();


</script>

<template>
  <div v-if="userConfig?.nonCommunityEdition">
    <div v-if="props.captchaKey" style="border-radius: 1.5rem;padding: 2rem;">
        <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/generate/' + props.captchaKey +'/'" 
            alt="captcha" 
            style="width: 75%; margin: 10px 20px 10px 40px;border-radius: 0.5rem;border:solid 2px #000;" 
        />
        <div v-if="context.holdOn" style="margin:10px 20px 10px 40px;">
          <div class="text-sm">
            {{ $t('captcha.instruction') }}
          </div>
          <div style="display:flex; flex-wrap: wrap; justify-content: space-between;">
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/0/' + props.captchaKey +'/'" alt="captcha pad0" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(0)+';'" @click="selectPad(0)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/1/' + props.captchaKey +'/'" alt="captcha pad1" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(1)+';'" @click="selectPad(1)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/2/' + props.captchaKey +'/'" alt="captcha pad2" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(2)+';'" @click="selectPad(2)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/3/' + props.captchaKey +'/'" alt="captcha pad3" :style="'width: 20%; margin: 10px 0px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(3)+';'" @click="selectPad(3)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/4/' + props.captchaKey +'/'" alt="captcha pad4" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(4)+';'" @click="selectPad(4)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/5/' + props.captchaKey +'/'" alt="captcha pad5" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(5)+';'" @click="selectPad(5)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/6/' + props.captchaKey +'/'" alt="captcha pad6" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(6)+';'" @click="selectPad(6)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/7/' + props.captchaKey +'/'" alt="captcha pad7" :style="'width: 20%; margin: 10px 0px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(7)+';'" @click="selectPad(7)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/8/' + props.captchaKey +'/'" alt="captcha pad8" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(8)+';'" @click="selectPad(8)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/9/' + props.captchaKey +'/'" alt="captcha pad9" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(9)+';'" @click="selectPad(9)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/10/' + props.captchaKey +'/'" alt="captcha pad10" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(10)+';'" @click="selectPad(10)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/11/' + props.captchaKey +'/'" alt="captcha pad11" :style="'width: 20%; margin: 10px 0px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(11)+';'" @click="selectPad(11)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/12/' + props.captchaKey +'/'" alt="captcha pad12" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(12)+';'" @click="selectPad(12)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/13/' + props.captchaKey +'/'" alt="captcha pad13" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(13)+';'" @click="selectPad(13)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/14/' + props.captchaKey +'/'" alt="captcha pad14" :style="'width: 20%; margin: 10px 5px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(14)+';'" @click="selectPad(14)"/>
            <img :src="config.public.BACKEND_API_BASE + '/common/1.0/captcha/15/' + props.captchaKey +'/'" alt="captcha pad15" :style="'width: 20%; margin: 10px 0px 0px 0px;border-radius: 0.5rem;border:solid 3px ' + getBorder(15)+';'" @click="selectPad(15)"/>
          </div>
          <div v-if="context.errorMessages" class="mt-4 text-sm text-red-600 h-3">
            {{ context.errorMessages }}
          </div>
          <div v-else class="mt-4 text-sm text-red-600 h-3"></div>
        </div>
    </div>
  </div>
</template>