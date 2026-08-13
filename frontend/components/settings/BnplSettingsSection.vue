<template>
  <div class="card-premium p-6 lg:col-span-2">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg mr-3">
        <CreditCardIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Financiamiento (Cashea / Krece)</h3>
    </div>

    <p class="text-sm text-gray-500 mb-6">
      Permite a tus clientes pagar en cuotas mediante Cashea o Krece. Cada plataforma requiere
      afiliarse por separado y obtener sus propias credenciales de comercio.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="p in providers"
        :key="p.provider"
        class="p-5 bg-gray-50 rounded-xl border border-gray-200"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-900">{{ p.provider === 'CASHEA' ? 'Cashea' : 'Krece' }}</span>
            <span
              v-if="p.isSimulated"
              class="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full"
            >
              Modo simulado
            </span>
          </div>
          <button
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0',
              forms[p.provider].isEnabled ? 'bg-workplace-red' : 'bg-gray-300'
            ]"
            @click="forms[p.provider].isEnabled = !forms[p.provider].isEnabled"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                forms[p.provider].isEnabled ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Store ID</label>
            <input v-model="forms[p.provider].storeId" type="text" class="input-field-sm" placeholder="Store ID">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Nombre de la tienda</label>
            <input v-model="forms[p.provider].storeName" type="text" class="input-field-sm" placeholder="Nombre registrado">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Public API Key</label>
            <input v-model="forms[p.provider].publicApiKey" type="text" class="input-field-sm" placeholder="Public API Key">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              Private API Key
              <span v-if="p.hasPrivateKey" class="text-green-600 font-normal">(configurada — dejar en blanco para no cambiar)</span>
            </label>
            <input v-model="forms[p.provider].privateApiKey" type="password" class="input-field-sm" placeholder="••••••••">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">External Client ID</label>
            <input v-model="forms[p.provider].externalClientId" type="text" class="input-field-sm" placeholder="External Client ID">
          </div>
        </div>

        <button
          :disabled="saving === p.provider"
          class="mt-4 w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-60"
          @click="handleSave(p.provider)"
        >
          {{ saving === p.provider ? 'Guardando...' : 'Guardar' }}
        </button>

        <p class="mt-3 text-[11px] text-gray-400">
          <a v-if="p.provider === 'CASHEA'" href="https://merchants.cashea.app/" target="_blank" rel="noopener" class="underline">
            Afiliarse en merchants.cashea.app
          </a>
          <a v-else href="https://www.krece.app/afiliaci%C3%B3n-de-comercio" target="_blank" rel="noopener" class="underline">
            Afiliarse en krece.app
          </a>
        </p>
      </div>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {{ error }}
    </div>
    <Transition name="fade">
      <div v-if="successMsg" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        {{ successMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import { CreditCardIcon } from '@heroicons/vue/24/outline'
import { useBnplSettings, type BnplProvider } from '~/composables/wallets/useBnplSettings'

const { providerSettings, saving, error, successMsg, loadBnplSettings, saveBnplSettings } = useBnplSettings()

const providers = providerSettings

const forms = reactive<Record<BnplProvider, {
  isEnabled: boolean
  storeId: string
  storeName: string
  publicApiKey: string
  privateApiKey: string
  externalClientId: string
}>>({
  CASHEA: { isEnabled: false, storeId: '', storeName: '', publicApiKey: '', privateApiKey: '', externalClientId: '' },
  KRECE: { isEnabled: false, storeId: '', storeName: '', publicApiKey: '', privateApiKey: '', externalClientId: '' },
})

function syncForms() {
  for (const p of providerSettings.value) {
    forms[p.provider].isEnabled = p.isEnabled
    forms[p.provider].storeId = p.storeId ?? ''
    forms[p.provider].storeName = p.storeName ?? ''
  }
}

watch(providerSettings, syncForms)

async function handleSave(provider: BnplProvider) {
  const form = forms[provider]
  await saveBnplSettings(provider, {
    isEnabled: form.isEnabled,
    storeId: form.storeId || undefined,
    storeName: form.storeName || undefined,
    publicApiKey: form.publicApiKey || undefined,
    privateApiKey: form.privateApiKey || undefined,
    externalClientId: form.externalClientId || undefined,
  })
  // Las keys no se re-muestran nunca (el backend no las devuelve en claro)
  form.publicApiKey = ''
  form.privateApiKey = ''
  form.externalClientId = ''
}

onMounted(loadBnplSettings)
</script>

<style scoped>
.input-field-sm {
  @apply w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
