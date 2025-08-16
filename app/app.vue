<script setup lang="ts">
import * as locales from '@nuxt/ui-pro/locale'
const { locale } = useI18n()
</script>

<template>
  <header>
  </header>
  <div>
    <UApp  :locale="locales[locale]">
      <NuxtLayout class="layouts">
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </div>
  <footer>
  </footer>
</template>
