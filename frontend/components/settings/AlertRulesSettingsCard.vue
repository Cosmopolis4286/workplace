<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg mr-3">
        <BellAlertIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Alertas de Business Shield</h3>
        <p class="text-xs text-gray-500">Cuándo avisarte de riesgos en margen, costos y proveedores</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="skeleton h-16 rounded-xl" />
    </div>

    <div v-else class="space-y-4">
      <div v-for="rule in rules" :key="rule.alertType" class="p-4 bg-gray-50 rounded-xl">
        <div class="flex items-start justify-between gap-4 mb-2">
          <div>
            <p class="text-sm font-semibold text-gray-800">{{ ALERT_TYPE_LABELS[rule.alertType] }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ ALERT_TYPE_DESCRIPTIONS[rule.alertType] }}</p>
          </div>
          <button
            type="button"
            @click="toggleEnabled(rule)"
            :class="rule.enabled ? 'bg-amber-500' : 'bg-gray-200'"
            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          >
            <span
              :class="rule.enabled ? 'translate-x-4' : 'translate-x-0'"
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200"
            />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model.number="drafts[rule.alertType]"
            type="number"
            min="0"
            step="0.5"
            class="input-field w-24 py-1.5 text-sm"
            :disabled="!rule.enabled"
          >
          <span class="text-xs text-gray-400">%</span>
          <button
            v-if="drafts[rule.alertType] !== rule.thresholdValue"
            class="text-xs font-medium text-amber-700 hover:text-amber-900"
            @click="save(rule)"
          >
            Guardar
          </button>
          <span v-if="rule.isDefault" class="text-xs text-gray-400 ml-1">(default)</span>
          <button
            v-else
            class="text-xs text-gray-400 hover:text-gray-600 ml-auto"
            @click="onReset(rule.alertType)"
          >
            Restablecer default
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-xs text-red-600 mt-3">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { BellAlertIcon } from '@heroicons/vue/24/outline'
import {
  useAlertRules, ALERT_TYPE_LABELS, ALERT_TYPE_DESCRIPTIONS,
  type AlertRule, type AlertType,
} from '~/composables/commerce/useAlertRules'

const { rules, loading, error, loadRules, updateRule, resetRule } = useAlertRules()

const drafts = ref<Record<string, number>>({})

watch(rules, (newRules) => {
  for (const rule of newRules) {
    if (!(rule.alertType in drafts.value)) drafts.value[rule.alertType] = rule.thresholdValue
  }
}, { immediate: true })

async function save(rule: AlertRule) {
  const value = drafts.value[rule.alertType]
  if (value === undefined || value < 0) return
  await updateRule(rule.alertType, value, rule.enabled)
}

async function toggleEnabled(rule: AlertRule) {
  await updateRule(rule.alertType, drafts.value[rule.alertType] ?? rule.thresholdValue, !rule.enabled)
}

async function onReset(alertType: AlertType) {
  await resetRule(alertType)
  delete drafts.value[alertType]
}

onMounted(loadRules)
</script>

<style scoped>
.input-field {
  @apply px-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 bg-white disabled:opacity-50;
}
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
