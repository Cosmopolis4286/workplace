<template>
  <NuxtLayout :name="layout">
  <div>
    <PageHeader
      title="Planes y Precios"
      description="Elige el plan perfecto para tu negocio. Empieza gratis y escala cuando lo necesites."
      :icon="CreditCardIcon"
      :breadcrumb="[{ label: 'Planes y Precios' }]"
    >
      <template #actions>
        <!-- Toggle mensual / anual -->
        <div class="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm">
          <button
            :class="['px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200', !annual ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            @click="annual = false"
          >Mensual</button>
          <button
            :class="['px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2', annual ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            @click="annual = true"
          >
            Anual
            <span class="bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">-20%</span>
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- ── Banner de suscripción actual (COMMERCE/FREELANCER) ───────────────── -->
    <div v-if="canChangePlan && mySubscription && myPlan" class="mb-6">
      <div
        class="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-l-4"
        :style="{ borderLeftColor: myPlan.color || '#ef4444' }"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" :style="{ backgroundColor: (myPlan.color || '#ef4444') + '15' }">
            <CreditCardIcon class="w-5 h-5" :style="{ color: myPlan.color || '#ef4444' }" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              Tu plan actual es <strong class="text-gray-900">{{ myPlan.name }}</strong>
              <span v-if="mySubscription.status === 'TRIAL'" class="badge bg-blue-100 text-blue-700 ml-2">Prueba</span>
            </p>
            <p v-if="mySubscription.endAt" class="text-xs mt-0.5" :class="(daysRemaining(mySubscription.endAt) ?? 999) <= 7 ? 'text-red-600 font-semibold' : 'text-gray-400'">
              {{ mySubscription.status === 'TRIAL' ? 'Tu prueba termina' : 'Vence' }} el
              {{ new Date(mySubscription.endAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) }}
              <template v-if="daysRemaining(mySubscription.endAt) !== null">
                ({{ daysRemaining(mySubscription.endAt) }} días restantes)
              </template>
            </p>
          </div>
        </div>
        <NuxtLink to="/my-plan" class="btn-secondary text-sm flex-shrink-0">Ver detalles de mi plan</NuxtLink>
      </div>
    </div>

    <!-- ── Solicitud pendiente de aprobación (upgrade NORMAL, o cambio a plan pago ya siendo FREELANCER/COMMERCE) ── -->
    <section v-if="(isNormalUser || canChangePlan) && pendingSubscription && upgradeStep !== 3" class="max-w-2xl mx-auto py-6">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-8 text-center">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon class="w-8 h-8 text-yellow-600" />
          </div>
          <h2 class="text-lg font-bold text-gray-900 mb-1">Tu solicitud está en revisión</h2>
          <p class="text-sm text-gray-500 max-w-md mx-auto">
            Tu solicitud para el plan <strong class="text-gray-700">{{ pendingSubscription.plan?.name }}</strong>
            está pendiente de aprobación por un administrador. Te notificaremos cuando sea revisada.
          </p>
          <span class="badge bg-yellow-100 text-yellow-700 mt-4 inline-block">Pendiente de aprobación</span>
        </div>
      </div>
    </section>

    <!-- ── Flujo upgrade usuario NORMAL ────────────────────────────────────── -->
    <section v-if="isNormalUser && (!pendingSubscription || upgradeStep === 3)" class="max-w-2xl mx-auto py-6">

      <!-- Banner -->
      <div v-if="upgradeStep !== 3" class="flex items-start gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
        <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <BoltIcon class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p class="text-sm font-semibold text-blue-900">Expande tu cuenta</p>
          <p class="text-sm text-blue-600 mt-0.5">Elige tu sector y un plan para convertirte en freelancer o comercio.</p>
        </div>
      </div>

      <!-- Steps -->
      <div v-if="upgradeStep !== 3" class="flex items-center gap-2 mb-8 justify-center">
        <template v-for="(label, i) in upgradeSteps" :key="i">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
              :class="i < upgradeStep
                ? 'bg-red-600 text-white'
                : i === upgradeStep
                  ? 'bg-red-600 text-white ring-4 ring-red-600/20'
                  : 'bg-gray-100 text-gray-400'"
            >
              <CheckIcon v-if="i < upgradeStep" class="w-4 h-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-xs font-medium hidden sm:block" :class="i <= upgradeStep ? 'text-gray-800' : 'text-gray-400'">{{ label }}</span>
          </div>
          <div
            v-if="i < upgradeSteps.length - 1"
            class="flex-1 h-0.5 max-w-14 rounded-full transition-colors duration-300"
            :class="i < upgradeStep ? 'bg-red-600' : 'bg-gray-200'"
          />
        </template>
      </div>

      <!-- Card de pasos -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6">

          <!-- Step 0: Categoría -->
          <template v-if="upgradeStep === 0">
            <h2 class="text-base font-bold text-gray-900 mb-0.5">¿En qué sector está tu negocio?</h2>
            <p class="text-sm text-gray-500 mb-5">Esto define qué módulos estarán disponibles para ti.</p>

            <div v-if="loadingCats" class="flex justify-center py-8">
              <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div v-else class="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
                :class="selectedCategory === cat.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
                @click="selectCategory(cat.id)"
              >
                <span class="text-xl leading-none">{{ cat.icon || '🏢' }}</span>
                <span class="text-sm font-medium text-gray-700 leading-tight">{{ cat.name }}</span>
              </button>
            </div>

            <div v-if="selectedCategory && subcategories.length > 0" class="mt-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subcategoría (opcional)</p>
              <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                <button
                  v-for="sub in subcategories"
                  :key="sub.id"
                  type="button"
                  class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
                  :class="selectedSubcategory === sub.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
                  @click="selectedSubcategory = sub.id"
                >
                  <span class="text-sm font-medium text-gray-700">{{ sub.name }}</span>
                </button>
              </div>
            </div>
            <p v-if="catError" class="text-xs text-red-600 mt-3 flex items-center gap-1">
              <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ catError }}
            </p>
          </template>

          <!-- Step 1: Plan -->
          <template v-if="upgradeStep === 1">
            <h2 class="text-base font-bold text-gray-900 mb-0.5">Elige tu plan</h2>
            <p class="text-sm text-gray-500 mb-5">Puedes cambiarlo en cualquier momento.</p>
            <div v-if="loadingPlans" class="flex justify-center py-8">
              <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div v-else class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              <button
                v-for="plan in plans"
                :key="plan.id"
                type="button"
                class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
                :class="selectedPlan === plan.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
                @click="selectedPlan = plan.id"
              >
                <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color || '#ef4444' }" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900">{{ plan.name }}</span>
                    <span v-if="plan.isPopular" class="badge bg-red-100 text-red-700">Popular</span>
                    <span
                      v-if="planTargetRole(plan)"
                      class="badge text-[10px]"
                      :class="planTargetRole(plan) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'"
                    >{{ planTargetRole(plan) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}</span>
                  </div>
                  <p class="text-xs text-gray-500 truncate mt-0.5">{{ plan.description }}</p>
                </div>
                <span class="font-bold text-sm text-gray-900 flex-shrink-0">
                  {{ currentPrice(plan) === 0 ? 'Gratis' : formatPrice(currentPrice(plan)) + (annual ? '/año' : '/mes') }}
                </span>
              </button>
            </div>
          </template>

          <!-- Step 2: Confirmar -->
          <template v-if="upgradeStep === 2">
            <h2 class="text-base font-bold text-gray-900 mb-0.5">Confirmar upgrade</h2>
            <p class="text-sm text-gray-500 mb-5">Revisa los detalles antes de continuar.</p>
            <div class="space-y-2.5">
              <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span class="text-xs text-gray-500">Plan</span>
                <span class="text-sm font-semibold text-gray-900">{{ selectedPlanObj?.name }}</span>
              </div>
              <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span class="text-xs text-gray-500">Sector</span>
                <span class="text-sm font-semibold text-gray-900">{{ selectedCategoryObj?.name }}</span>
              </div>
              <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span class="text-xs text-gray-500">Precio</span>
                <span class="text-sm font-bold text-gray-900">
                  {{ selectedPlanObj && currentPrice(selectedPlanObj) === 0 ? 'Gratis' : (selectedPlanObj ? formatPrice(currentPrice(selectedPlanObj)) + (annual ? '/año' : '/mes') : '—') }}
                </span>
              </div>
              <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span class="text-xs text-gray-500">Tu nuevo rol</span>
                <span
                  class="badge"
                  :class="selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'"
                >{{ selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}</span>
              </div>
            </div>
            <div class="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
              Al confirmar, tu solicitud quedará en revisión y un administrador deberá aprobarla antes de activar tu nuevo rol.
            </div>
            <div
              v-if="myKycStatus?.kycStatus !== 'APPROVED'"
              class="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed"
            >
              Además, tu administrador no podrá aprobar este upgrade hasta que verifiques tu identidad (KYC).
              <NuxtLink to="/profile" class="font-semibold underline">Completa la verificación desde tu perfil</NuxtLink>.
            </div>
          </template>

          <!-- Step 3: Listo -->
          <template v-if="upgradeStep === 3">
            <div class="text-center py-6">
              <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon class="w-8 h-8 text-yellow-600" />
              </div>
              <h2 class="text-lg font-bold text-gray-900 mb-1">¡Solicitud enviada!</h2>
              <p class="text-sm text-gray-500">Tu solicitud está pendiente de aprobación por un administrador. Te notificaremos cuando sea revisada.</p>
            </div>
          </template>

          <p v-if="upgradeError" class="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mt-4 flex items-center gap-1.5">
            <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ upgradeError }}
          </p>
        </div>

        <!-- Acciones -->
        <div v-if="upgradeStep < 3" class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            v-if="upgradeStep > 0"
            type="button"
            :disabled="upgrading"
            class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded-xl transition-colors disabled:opacity-50"
            @click="upgradeStep--"
          >← Atrás</button>
          <button
            v-if="upgradeStep < 2"
            type="button"
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
            @click="nextUpgradeStep"
          >Continuar →</button>
          <button
            v-if="upgradeStep === 2"
            type="button"
            :disabled="upgrading"
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            @click="confirmUpgrade"
          >
            <span v-if="upgrading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ upgrading ? 'Procesando...' : 'Confirmar upgrade' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Cards de planes (vista normal / no autenticado) ──────────────────── -->
    <section v-else>

      <div v-if="error" class="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
        <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0" />
        <span class="text-sm text-red-700">{{ error }}</span>
      </div>

      <p v-if="changePlanError" class="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700">
        <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0" />
        {{ changePlanError }}
      </p>

      <!-- Skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="card p-6 animate-pulse space-y-4">
          <div class="skeleton h-5 w-32 rounded" />
          <div class="skeleton h-10 w-24 rounded" />
          <div class="skeleton h-3 w-48 rounded" />
          <div class="space-y-2 pt-2">
            <div v-for="n in 4" :key="n" class="skeleton h-3 rounded" :class="n % 2 === 0 ? 'w-4/5' : 'w-full'" />
          </div>
          <div class="skeleton h-11 rounded-xl mt-2" />
        </div>
      </div>

      <div v-else-if="plans.length === 0" class="card text-center py-20 text-gray-400">
        <CreditCardIcon class="w-14 h-14 mx-auto mb-4 opacity-30" />
        <p class="text-lg font-medium">No hay planes disponibles en este momento</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="relative flex flex-col card border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
          :class="myPlan?.id === plan.id ? '' : (plan.isPopular ? 'border-red-500 shadow-red-100/60' : 'border-gray-200')"
          :style="myPlan?.id === plan.id ? { borderColor: plan.color || '#ef4444' } : {}"
        >
          <!-- Banner popular / plan actual -->
          <div v-if="myPlan?.id === plan.id" class="bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs font-black text-center py-2 tracking-widest uppercase">
            ✓ Tu Plan Actual
          </div>
          <div v-else-if="plan.isPopular" class="bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs font-black text-center py-2 tracking-widest uppercase">
            ★ Más Popular
          </div>

          <!-- Cabecera -->
          <div class="p-6 pb-4" :class="plan.isPopular || myPlan?.id === plan.id ? 'bg-red-50/50' : 'bg-white'">
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span v-if="plan.color" class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: plan.color }" />
                  <h3 class="text-lg font-black text-gray-900">{{ plan.name }}</h3>
                </div>
                <p class="text-sm text-gray-500 leading-snug">{{ plan.description }}</p>
              </div>
            </div>

            <!-- Precio -->
            <div class="mt-2">
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-black text-gray-900">
                  {{ currentPrice(plan) === 0 ? 'Gratis' : formatPrice(currentPrice(plan)) }}
                </span>
                <span v-if="currentPrice(plan) > 0" class="text-gray-400 text-sm">/ {{ annual ? 'año' : 'mes' }}</span>
              </div>
              <p v-if="annual && plan.priceAnnual && plan.priceMonthly" class="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                <CheckIcon class="w-3 h-3" />
                Ahorras {{ formatPrice((plan.priceMonthly * 12) - plan.priceAnnual) }} al año
              </p>
            </div>
          </div>

          <!-- Cuerpo -->
          <div class="px-6 pb-6 flex-1 flex flex-col">
            <!-- Límites -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-5 py-4 border-y border-gray-100">
              <div class="flex items-center gap-1.5 text-gray-600">
                <span class="text-base">📦</span>
                <span>{{ formatLimit(plan.maxProducts) }} productos</span>
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <span class="text-base">👥</span>
                <span>{{ formatLimit(plan.maxEmployees) }} empleados</span>
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <span class="text-base">🏢</span>
                <span>{{ formatLimit(plan.maxBranches) }} sucursales</span>
              </div>
              <div class="flex items-center gap-1.5 text-gray-600">
                <span class="text-base">📋</span>
                <span>{{ formatLimit(plan.maxOrders ?? null) }} pedidos</span>
              </div>
            </div>

            <!-- Features -->
            <ul class="space-y-2 mb-6 flex-1">
              <li v-for="(feat, fi) in plan.features" :key="fi" class="flex items-start gap-2.5">
                <CheckIcon class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span class="text-sm text-gray-700 leading-snug">{{ feat }}</span>
              </li>
            </ul>

            <!-- CTA -->
            <div v-if="myPlan?.id === plan.id" class="w-full text-center px-6 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500">
              Plan actual ✓
            </div>
            <button
              v-else-if="canChangePlan"
              type="button"
              :disabled="changingPlan === plan.id"
              class="w-full text-center px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              :class="plan.isPopular
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
              @click="changePlan(plan)"
            >
              <span v-if="changingPlan === plan.id" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {{ changingPlan === plan.id ? 'Procesando...' : 'Cambiar a este plan' }}
            </button>
            <NuxtLink
              v-else
              :to="isAuthenticated ? '/my-plan' : '/register'"
              class="block w-full text-center px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200"
              :class="plan.isPopular
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
            >
              {{ isAuthenticated ? 'Ver mi plan' : (currentPrice(plan) === 0 ? 'Empezar gratis' : 'Contratar') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Tabla comparativa ─────────────────────────────────────────────────── -->
    <section v-if="!isNormalUser && !loading && plans.length > 0" class="mt-8">
      <h2 class="text-xl font-black text-gray-900 mb-4">Comparativa de planes</h2>
      <div class="card overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">Característica</th>
              <th
                v-for="plan in plans.slice(0, 4)"
                :key="plan.id"
                class="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider"
                :class="plan.isPopular ? 'text-red-600' : 'text-gray-500'"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in compareRows" :key="row.label" class="hover:bg-gray-50 transition-colors">
              <td class="px-5 py-3.5 text-gray-700 font-medium">{{ row.label }}</td>
              <td v-for="plan in plans.slice(0, 4)" :key="plan.id" class="px-4 py-3.5 text-center">
                <span class="font-semibold text-gray-900">{{ row.getValue(plan) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── FAQ ──────────────────────────────────────────────────────────────── -->
    <section class="mt-8 max-w-2xl mx-auto">
      <h2 class="text-xl font-black text-gray-900 text-center mb-6">Preguntas frecuentes</h2>
      <div class="space-y-3">
        <div
          v-for="(faq, i) in faqs"
          :key="i"
          class="card overflow-hidden"
        >
          <button
            class="w-full flex items-center justify-between px-5 py-4 text-left"
            @click="openFaq = openFaq === i ? null : i"
          >
            <span class="text-sm font-semibold text-gray-900">{{ faq.q }}</span>
            <ChevronDownIcon
              class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
              :class="openFaq === i ? 'rotate-180' : ''"
            />
          </button>
          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div v-if="openFaq === i" class="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {{ faq.a }}
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- ── Footer CTA ────────────────────────────────────────────────────────── -->
    <section class="mt-8 bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl py-12 px-6 text-center text-white shadow-xl">
      <h3 class="text-2xl font-black mb-2">¿Tienes preguntas?</h3>
      <p class="text-red-100 mb-6">Nuestro equipo está listo para ayudarte a elegir el plan ideal para tu negocio.</p>
      <a
        href="mailto:soporte@workplacemanager.com"
        class="inline-flex items-center gap-2.5 bg-white text-red-600 hover:bg-red-50 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg shadow-red-900/20"
      >
        <EnvelopeIcon class="w-4 h-4" />
        Contáctanos
      </a>
    </section>

  </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BoltIcon, CheckIcon, ExclamationCircleIcon,
  CreditCardIcon, ChevronDownIcon, EnvelopeIcon, ClockIcon,
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import PageHeader from '~/components/ui/PageHeader.vue'
import { usePlans } from '~/composables/usePlans'
import { useKyc } from '~/composables/useKyc'

// Página híbrida: visitantes anónimos la ven como landing pública (layout
// 'public'), usuarios con sesión la ven dentro del backoffice (layout
// 'default', con sidebar) para poder cambiar de plan. Mismo patrón que
// pages/p/[username].vue.
definePageMeta({ layout: false })

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceAnnual?: number
  price?: number
  color?: string
  isPopular?: boolean
  features: string[]
  maxProducts?: number | null
  maxEmployees?: number | null
  maxBranches?: number | null
  maxOrders?: number | null
  forFreelancer?: boolean
  forCommerce?: boolean
  forNormal?: boolean
}

interface Category { id: string; name: string; icon?: string }
interface Subcategory { id: string; name: string }

const { user, isAuthenticated, fetchProfile, ensureSessionVerified } = useAuth()
const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const { mySubscription, pendingSubscription, myPlan, fetchMySubscription, daysRemaining } = usePlans()

// La sesión cacheada podría estar caducada (token expirado); confirmamos
// contra el servidor antes de decidir qué layout/contenido mostrar.
await ensureSessionVerified()
const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

// ─── Estado ───────────────────────────────────────────────────────────────────
const plans        = ref<Plan[]>([])
const categories   = ref<Category[]>([])
const subcategories = ref<Subcategory[]>([])
const loading      = ref(false)
const loadingCats  = ref(false)
const loadingPlans = ref(false)
const error        = ref<string | null>(null)
const annual       = ref(false)
const openFaq      = ref<number | null>(null)
const changingPlan   = ref<string | null>(null)
const changePlanError = ref('')

// ─── Flujo upgrade ────────────────────────────────────────────────────────────
const upgradeSteps    = ['Tu sector', 'Tu plan', 'Confirmar']
const upgradeStep     = ref(0)
const selectedCategory    = ref('')
const selectedSubcategory = ref('')
const selectedPlan    = ref('')
const catError        = ref('')
const upgradeError    = ref('')
const upgrading       = ref(false)

const isNormalUser       = computed(() => isAuthenticated.value && user.value?.role === 'NORMAL')
const canChangePlan      = computed(() => isAuthenticated.value && (user.value?.role === 'COMMERCE' || user.value?.role === 'FREELANCER'))
const selectedPlanObj    = computed(() => plans.value.find(p => p.id === selectedPlan.value) ?? null)
const selectedCategoryObj = computed(() => categories.value.find(c => c.id === selectedCategory.value) ?? null)

function planTargetRole(plan: Plan): 'FREELANCER' | 'COMMERCE' | null {
  if (plan.forFreelancer && !plan.forCommerce) return 'FREELANCER'
  if (plan.forCommerce) return 'COMMERCE'
  if (plan.forFreelancer) return 'FREELANCER'
  return null
}

function currentPrice(plan: Plan): number {
  if (annual.value && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? plan.price ?? 0
}

function formatPrice(amount: number): string {
  if (amount === 0) return 'Gratis'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined || value < 0) return '∞'
  return value.toLocaleString('es-MX')
}

// ─── Tabla comparativa ────────────────────────────────────────────────────────
const compareRows = computed(() => [
  { label: 'Precio mensual',  getValue: (p: Plan) => currentPrice(p) === 0 ? 'Gratis' : formatPrice(p.priceMonthly ?? 0) },
  { label: 'Precio anual',    getValue: (p: Plan) => p.priceAnnual ? formatPrice(p.priceAnnual) : '—' },
  { label: 'Productos',       getValue: (p: Plan) => formatLimit(p.maxProducts) },
  { label: 'Empleados',       getValue: (p: Plan) => formatLimit(p.maxEmployees) },
  { label: 'Sucursales',      getValue: (p: Plan) => formatLimit(p.maxBranches) },
  { label: 'Pedidos / mes',   getValue: (p: Plan) => formatLimit(p.maxOrders) },
])

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const faqs = [
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes actualizar o bajar de plan cuando quieras. Los cambios se aplican al inicio del siguiente período de facturación.' },
  { q: '¿Qué pasa cuando llego al límite de mi plan?', a: 'Recibirás un aviso cuando estés cerca del límite. Puedes actualizar tu plan para seguir usando todas las funciones sin interrupciones.' },
  { q: '¿El plan gratuito tiene fecha de vencimiento?', a: 'No. El plan gratuito no vence y no requiere tarjeta de crédito. Puedes usarlo indefinidamente con las funciones incluidas.' },
  { q: '¿Cómo funciona la facturación anual?', a: 'Al elegir facturación anual obtienes un 20% de descuento sobre el precio mensual. Se cobra un único pago al inicio del año.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, sin penalizaciones ni contratos de permanencia. Puedes cancelar desde la sección "Mi Plan" de tu cuenta.' },
]

// ─── Carga de datos ───────────────────────────────────────────────────────────
async function loadPlans() {
  loading.value = true; loadingPlans.value = true
  try {
    const { get } = useApi()
    const data = await get('/plans/public')
    plans.value = Array.isArray(data) ? data : (data as any)?.data ?? []
  } catch (e: any) {
    error.value = e?.data?.message ?? e?.message ?? 'Error cargando planes'
  } finally { loading.value = false; loadingPlans.value = false }
}

async function loadCategories() {
  if (categories.value.length > 0) return
  loadingCats.value = true
  try {
    const { get } = useApi()
    categories.value = await get('/users/categories')
  } catch { } finally { loadingCats.value = false }
}

async function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
  selectedSubcategory.value = ''
  subcategories.value = []
  try {
    const { get } = useApi()
    subcategories.value = await get(`/users/categories/${categoryId}/subcategories`)
  } catch { }
}

// ─── Cambio de plan (COMMERCE / FREELANCER) ───────────────────────────────────
// Un plan gratuito se activa de inmediato. Un plan pago queda pendiente de
// aprobación admin (ver PlansService.selfSubscribe) — el pago no se verifica
// automáticamente, así que no puede activarse solo con este click.
async function changePlan(plan: Plan) {
  changePlanError.value = ''
  const isPaid = currentPrice(plan) > 0
  const priceLabel = isPaid ? formatPrice(currentPrice(plan)) + (annual.value ? '/año' : '/mes') : 'Gratis'
  const confirmMsg = isPaid
    ? `¿Solicitar el plan "${plan.name}" (${priceLabel})? Un administrador revisará tu solicitud antes de activarlo.`
    : `¿Cambiar al plan "${plan.name}" (${priceLabel})? Tu suscripción actual será reemplazada.`
  if (!confirm(confirmMsg)) return

  changingPlan.value = plan.id
  try {
    const { post } = useApi()
    await post('/plans/self-subscribe', {
      planId: plan.id,
      interval: annual.value ? 'ANNUAL' : 'MONTHLY',
    })
    await fetchMySubscription()
  } catch (e: any) {
    changePlanError.value = e?.data?.message ?? e?.message ?? 'Error al cambiar de plan. Intenta de nuevo.'
  } finally {
    changingPlan.value = null
  }
}

// ─── Flujo upgrade ────────────────────────────────────────────────────────────
async function nextUpgradeStep() {
  upgradeError.value = ''
  if (upgradeStep.value === 0) {
    if (!selectedCategory.value) { catError.value = 'Selecciona un sector para continuar'; return }
    catError.value = ''
    upgradeStep.value = 1
  } else if (upgradeStep.value === 1) {
    upgradeStep.value = 2
  }
}

async function confirmUpgrade() {
  if (!selectedPlan.value || !selectedCategory.value) return
  upgradeError.value = ''
  upgrading.value = true
  try {
    const { post } = useApi()
    await post('/plans/upgrade', {
      planId: selectedPlan.value,
      categoryId: selectedCategory.value,
      interval: annual.value ? 'ANNUAL' : 'MONTHLY',
    })

    await fetchProfile()
    await fetchMySubscription()

    upgradeStep.value = 3
  } catch (e: any) {
    upgradeError.value = e?.data?.message ?? e?.message ?? 'Error al procesar el upgrade. Intenta de nuevo.'
  } finally { upgrading.value = false }
}

onMounted(async () => {
  await loadPlans()
  if (isNormalUser.value) {
    await fetchMySubscription()
    if (!pendingSubscription.value) loadCategories()
    fetchMyKycStatus()
  }
  if (canChangePlan.value) fetchMySubscription()
})
</script>
