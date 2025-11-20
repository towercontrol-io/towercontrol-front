<script setup lang="ts">
    import type { InputPasswordFields } from '~/types/compInputPassword';
    import type { UserConfigResponse } from '~/types';
    const { t } = useI18n();

    const model = defineModel<InputPasswordFields<string>>({ required: true }) // v-model

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { $apiBackendUsers } = useNuxtApp();
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    // --------------------------------------
    // Manage the password validity display
    // --------------------------------------

    const show = ref<boolean>(false);
    const repeatPassword = ref<string>('');

    function checkStrength(str: string) {
        const requirements = [];

        if ( userConfig.value?.passwordMinSize ) {
            requirements.push({
                regex: new RegExp(`.{${userConfig.value.passwordMinSize},}`),
                text: `${t('tools.atLeast')} ${userConfig.value.passwordMinSize} ${userConfig.value.passwordMinSize > 1 ? t('tools.characters') : t('tools.character')}`
            });
        }
        if ( userConfig.value?.passwordMinDigits ) {
            requirements.push({
                regex: new RegExp(`\\d{${userConfig.value.passwordMinDigits},}`),
                text: `${t('tools.atLeast')} ${userConfig.value.passwordMinDigits} ${userConfig.value.passwordMinDigits > 1 ? t('tools.digits') : t('tools.digit')}`
            });
        }
        if ( userConfig.value?.passwordMinLowerCase ) {
            requirements.push({
                regex: new RegExp(`\[a-z]{${userConfig.value.passwordMinLowerCase},}`),
                text: `${t('tools.atLeast')} ${userConfig.value.passwordMinLowerCase} ${userConfig.value.passwordMinLowerCase > 1 ? t('tools.lowercases') : t('tools.lowercase')}`
            });
        }
        if ( userConfig.value?.passwordMinUpperCase ) {
            requirements.push({
                regex: new RegExp(`\[A-Z]{${userConfig.value.passwordMinUpperCase},}`),
                text: `${t('tools.atLeast')} ${userConfig.value.passwordMinUpperCase} ${userConfig.value.passwordMinUpperCase > 1 ? t('tools.uppercases') : t('tools.uppercase')}`
            });
        }
        if ( userConfig.value?.passwordMinSymbols ) {
            requirements.push({
                regex: new RegExp(`\[^A-Za-z0-9]{${userConfig.value.passwordMinSymbols},}`),
                text: `${t('tools.atLeast')} ${userConfig.value.passwordMinSymbols} ${userConfig.value.passwordMinSymbols > 1 ? t('tools.symbols') : t('tools.symbol')}`
            });
        }
        
        let result = requirements.map(req => ({ met: req.regex.test(str), text: req.text }))
        result.push({
            met: repeatPassword.value.length > 0 && repeatPassword.value === model.value.password,
            text: t('tools.passwordRepeated')
        });
        return result;
    }

    const strength = computed(() => checkStrength(model.value.password));
    const strengthScore = computed(() => strength.value.filter(req => req.met).length);
    const strengthColor = computed(() => {
        // number of rules to met
        let rulesToMeet : number = 0;
        if ( userConfig.value?.passwordMinSize ) rulesToMeet++;
        if ( userConfig.value?.passwordMinDigits ) rulesToMeet++;
        if ( userConfig.value?.passwordMinLowerCase ) rulesToMeet++;
        if ( userConfig.value?.passwordMinUpperCase ) rulesToMeet++;
        if ( userConfig.value?.passwordMinSymbols ) rulesToMeet++;

        model.value.valid = (strengthScore.value > rulesToMeet);
        model.value.confirmed = (repeatPassword.value.length > 0 && repeatPassword.value === model.value.password);

        if (model.value.password.length == 0) return 'neutral';
        if (strengthScore.value >= rulesToMeet) return 'success';
        if (strengthScore.value == 0) return 'error';
        return 'warning';
        });

    // --------------------------------------
    // Manage the password complexity display
    // --------------------------------------

    function checkDiversity(str: string) {
        const requirements = [
            { regex: /\d/, text: 'number' },
            { regex: /[a-z]/, text: 'lowercase' },
            { regex: /[A-Z]/, text: 'uppercase' },
            { regex: /[A-Z]/, text: 'uppercase' },
            { regex: /[^A-Za-z0-9]/, text: 'symbol' }
        ];
        return requirements.map(req => ({ met: req.regex.test(str), text: req.text }))
    }

    const score : ComputedRef<number> = computed(() => { 
        // Password score established that way 
        // Password size < 8 = 0 point
        // Password size > 8 + 1 point
        // Password size > 15 + 2 points
        // Password size > 25 + 3 points
        // Diversité (lowercase, uppercase, digits, symbols) for 2 of each + 1 point
        // Diversité (lowercase, uppercase, digits, symbols) for 3 of each + 2 points
        // Diversité (lowercase, uppercase, digits, symbols) for 4 of each + 3 points
        if (model.value.password.length == 0) return 0 as number;
        if (model.value.password.length < 8) return 1 as number;
        let points :number = 1;
        if (model.value.password.length >= 8) points++;
        if (model.value.password.length >= 15) points++;
        if (model.value.password.length >= 25) points++;
        points += -1 + checkDiversity(model.value.password)
            .filter(req => req.met)
            .length; // 1 point for each diversity met
        
        return points;
    });

    const color = computed(() => {
        if (score.value === 0) return 'neutral'
        if (score.value <= 1) return 'error'
        if (score.value <= 3) return 'warning'
        return 'success'
    })

    const text = computed(() => {
        if (score.value === 0) return t('tools.enterPassword');
        if (score.value <= 1) return t('tools.weakPassword');
        if (score.value <= 3) return t('tools.mediumPassword');
        return t('tools.strongPassword');
    })

    // --------------------------------------
    // Manage the password repeat
    // --------------------------------------
    const repeatColor = computed(() => {
     //   model.value.confirmed = (repeatPassword.value.length > 0 && repeatPassword.value === model.value.password);

        if ( repeatPassword.value.length === 0 ) return 'neutral';
        if ( repeatPassword.value.length < model.value.password.length ) return 'warning';
        if ( repeatPassword.value !== model.value.password ) return 'error';
    });


</script>

<template>

  <div v-if="pending">
    {{ t('common.loading') }}
    <UProgress animation="swing" />
  </div>

  <div v-if="!pending && !error" class="space-y-2">
    <UFormField :label="$t('tools.password')" required>
      <UInput
        v-model="model.password"
        :placeholder="$t('tools.password')"
        :color="strengthColor"
        :type="show ? 'text' : 'password'"
        :aria-invalid="strengthScore < 4"
        aria-describedby="password-strength"
        :ui="{ trailing: 'pe-1' }"
        class="w-full"
      >
        <template #trailing>
          <UButton
            color="neutral"
            variant="link"
            size="sm"
            :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="show ? 'Hide password' : 'Show password'"
            :aria-pressed="show"
            aria-controls="password"
            @click="show = !show"
          />
        </template>
      </UInput>
    </UFormField>
    <UFormField :label="$t('tools.repeatPassword')" required>
      <UInput
        v-model="repeatPassword"
        :placeholder="$t('tools.repeatPassword')"
        :color="repeatColor"
        :type="show ? 'text' : 'password'"
        :aria-invalid="strengthScore < 4"
        aria-describedby="password-strength"
        :ui="{ trailing: 'pe-1' }"
        class="w-full"
      />
    </UFormField>
    <p class="text-xs text-muted" style="text-align: left;;">
        {{ t('tools.passwordRequirements') }}
    </p>
    <ul class="space-y-1" aria-label="Password requirements">
      <li
        v-for="(req, index) in strength"
        :key="index"
        class="flex items-center gap-0.5"
        :class="req.met ? 'text-success' : 'text-muted'"
      >
        <UIcon :name="req.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="size-4 shrink-0" />

        <span class="text-xs font-light">
          {{ req.text }}
        </span>
      </li>
    </ul>

    <UProgress
      :color="color"
      :indicator="text"
      :model-value="score"
      :max="4"
      size="sm"
    />

    <p id="password-strength" :class="`text-sm font-medium text-${color}`">
      {{ text }}
    </p>

  </div>
</template>

