<script lang="ts" setup>
/**
 * PhoneNumber Input component
 * This component allows users to input and validate phone numbers with country codes.
 * It uses the libphonenumber-js library to handle phone number parsing and validation.
 * It is based on https://github.com/roiLeo/nuxtUI-PhoneNumberInput/tree/main
 * With Nuxt/UI v3/4 adaptations.
 */

import { type CountryCode, type Examples, getCountries, getCountryCallingCode, parsePhoneNumberFromString, getExampleNumber, type NationalNumber } from 'libphonenumber-js';
import type { PhoneNumberInputState } from '~/types';

const props = defineProps({ 
  modelValue: { type: Object as PropType<PhoneNumberInputState | null>, required: true, default : null },
  e164: { type: String, required: false, default: '' },
  isoCountry: { type: String, required: false, default: 'FR' },
});
const emit = defineEmits(['update:modelValue'])

const locale = ref('en')
const phoneNumber = ref<string>('')
const autoFormat = ref<boolean>(true)
const selectedCountry = ref<CountryCode>('FR')
const results = ref<any>({
  isValid: false,
  countryCode: undefined,
})



const sanitizePhoneNumber = (input?: string) => {
	if (!input) { return '' }
	const regex = new RegExp(/[^\d ()+-]/g) // Keep only digits, (), - and + characters
	return input.replaceAll(regex, '').trim() // Keep only digits, (), - and + characters
}

const getPhoneNumberResults = ({ phoneNumber, countryCode }: { phoneNumber?: string; countryCode?: CountryCode }): any  =>{
	try {
		if (!phoneNumber) {
			return {
				isValid: false,
				countryCode
			}
		}

		const parsedNumber = parsePhoneNumberFromString(phoneNumber, countryCode)

		return {
			countryCode: parsedNumber?.country ?? countryCode,
			isValid: parsedNumber?.isValid() ?? false,
			isPossible: parsedNumber?.isPossible(),
			countryCallingCode: parsedNumber?.countryCallingCode,
			nationalNumber: parsedNumber?.nationalNumber,
			type: parsedNumber?.getType(),
			formatInternational: parsedNumber?.formatInternational(),
			formatNational: parsedNumber?.formatNational(),
			uri: parsedNumber?.getURI(),
			e164: parsedNumber?.format('E.164'),
			rfc3966: parsedNumber?.format('RFC3966'),
			phoneNumber
		}
	} catch (error) {
		throw new Error(`(getResultsFromPhoneNumber) ${error}`)
	}
}

const getPhoneNumberExample = (examples: Examples, countryCode?: CountryCode) => {
	try {
		if (!examples) { return }
		return countryCode ? getExampleNumber(countryCode, examples)?.formatNational() : undefined
	} catch (error) {
		console.error(`(PhoneNumberInput) ${error}`)
	}
}

async function getPhoneNumberExamplesFile() {
	const { default: data } = await import('libphonenumber-js/examples.mobile.json')
	return data
}

const selectedCountryDialcode = computed(() => countries.value?.filter((country) => country.id === selectedCountry.value)[0]?.dialCode)
const inputLabel = computed(() => {
  const defaultPlaceholder = 'example'
  const example = getPhoneNumberExample(examples.value as Examples, selectedCountry.value)
  return !example ? defaultPlaceholder : example
})

let displayNamesInstance: Intl.DisplayNames | undefined = undefined
let displayNamesLocale: string | undefined = undefined

const getCountryName = (
  locale: string,
  code: CountryCode | string,
  customCountriesNameListByIsoCode?: Record<CountryCode, string>
): string | undefined => {
  if (customCountriesNameListByIsoCode?.[code]) {
    return customCountriesNameListByIsoCode[code]
  }

  if (displayNamesLocale !== locale || !displayNamesInstance) {
    displayNamesLocale = locale
    displayNamesInstance = new Intl.DisplayNames([locale], { type: 'region' })
  }

  return displayNamesInstance.of(code)
}

const { data: examples } = await useAsyncData(async () => await getPhoneNumberExamplesFile())

const { data: countries } = await useAsyncData(async () => {
  const isoList = getCountries()
  const countriesList: any[] = []
  for (const iso2 of isoList) {
    const label = getCountryName(locale.value, iso2)
    if (label) {
      const dialCode = getCountryCallingCode(iso2)
      countriesList.push({
        id: iso2,
        label: label,
        dialCode: dialCode,
      })
    }
  }
  return countriesList
})

/**
 * Watch for changes in the selected country and update the phone number accordingly
 * Apply formating and validation on user actions
 */
watch(
  () => selectedCountry.value,
  (value, oldValue) => {
    if (value && value !== oldValue && value !== selectedCountry.value) {
      onCountryChanged({ countryCode: value, autoFormat: autoFormat.value, noFormattingAsYouType: false })
    }
  },
  { immediate: true, }
)

// ----------------
// handle phone number changes
function onPhoneNumberChanged({ newPhoneNumber, autoFormat, noFormattingAsYouType, updateResults = true, }: {
  newPhoneNumber: string; autoFormat: boolean; noFormattingAsYouType: boolean; updateResults?: boolean;
}) {

  const containsOnlyNumbers = /^[\d\s]*$/.test(newPhoneNumber)

  if (!containsOnlyNumbers) {
    results.value = { isValid: false, countryCode: undefined }
    emit('update:modelValue', results.value)
    return
  }

  const sanitizedPhoneNumber = sanitizePhoneNumber(newPhoneNumber)
  if (sanitizedPhoneNumber === '') {
    results.value = { isValid: false, countryCode: undefined }
    emit('update:modelValue', results.value)
  } else if (updateResults) {
    results.value = getPhoneNumberResults({
      phoneNumber: sanitizedPhoneNumber,
      countryCode: selectedCountry.value,
    })
    emit('update:modelValue', results.value)
  }

  if (results.value.isValid && results.value.formatNational && autoFormat) {
    phoneNumber.value = results.value.formatNational
  } else {
    phoneNumber.value = sanitizedPhoneNumber
  }

  if ( results.value.countryCode && results.value.countryCode !== selectedCountry.value ) {
    onCountryChanged({ countryCode: results.value.countryCode, autoFormat, noFormattingAsYouType, updateResults: false });
  }
}

// ----------------
// Handle country change
function onCountryChanged({ countryCode, autoFormat, noFormattingAsYouType, updateResults = true, }: {
  countryCode?: CountryCode; autoFormat: boolean; noFormattingAsYouType: boolean; updateResults?: boolean }) 
{
  if (updateResults) {
    results.value = getPhoneNumberResults({
      phoneNumber: phoneNumber.value,
      countryCode,
    })
  }
  onPhoneNumberChanged({ newPhoneNumber: phoneNumber.value, autoFormat, noFormattingAsYouType, updateResults,});
}


/**
 * Setup the initial phone number from the props
 * We need to determine the phone number from the e164 and the isoCountry code.
 */
const initPhoneForm = () => {
  if (props.e164) {
    const parsedNumber = parsePhoneNumberFromString(props.e164, props.isoCountry as CountryCode);
    if (parsedNumber) {
      selectedCountry.value = parsedNumber?.country as CountryCode;
      phoneNumber.value = parsedNumber?.nationalNumber as NationalNumber;
      onPhoneNumberChanged({
        newPhoneNumber: phoneNumber.value,
        autoFormat: true,
        noFormattingAsYouType: false, // No formatting as you type when initializing
        updateResults: true, // Do not update results on initialization
      });
    }
  }
}; initPhoneForm();


</script>

<template>
  <UForm
    :state="props.modelValue"
    label="Phone number"
    name="phone"
  >
    <UButtonGroup class="w-full">
      <USelectMenu
        class="w-35"
        v-model="selectedCountry"
        clear-search-on-close
        searchable
        searchable-placeholder="Search a country..."
        :search-input="{ icon: 'i-lucide-search' }"
        :items="countries"
        value-key="id"
      >
        <template #leading>
          <span
            class="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px]"
          >
            <span class="grey-text text-xs">+{{ selectedCountryDialcode }}</span>
          </span>
        </template>
        <template #item-label="{ item: country }">
          <span
            class="relative inline-flex h-5 w-10 flex-shrink-0 items-center justify-center rounded-full text-[10px]"
          >
            <span class="grey-text text-xs">+{{ country.dialCode }}</span>
          </span>
          <div class="inline truncate">
            {{ country.label }}
          </div>
        </template>
      </USelectMenu>
      <UInput
        type="tel"
        class="w-full"
        :trailing-icon="
          modelValue && !results.isValid
            ? 'i-heroicons-exclamation-triangle-20-solid'
            : 'i-heroicons-check-20-solid'
        "
        :model-value="phoneNumber"
        :placeholder="inputLabel"
        @update:model-value="
          onPhoneNumberChanged({
            newPhoneNumber: $event,
            autoFormat,
            noFormattingAsYouType: false,
          })
        "
      />
    </UButtonGroup>
  </UForm>
</template>
