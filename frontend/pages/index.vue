<template>
  <div class="min-h-screen bg-white font-sans" :class="{ 'js-ready': jsReady }">

    <!-- ─── Navbar ─────────────────────────────────────────────────────────── -->
    <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <!-- Logo -->
        <AppLogo />

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#features" :aria-label="t('landing.nav.featuresAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.features') }}</a>
          <a href="#how" :aria-label="t('landing.nav.howAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.how') }}</a>
          <a href="#testimonials" :aria-label="t('landing.nav.testimonialsAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.testimonials') }}</a>
          <a href="#pricing" :aria-label="t('landing.nav.pricingAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.pricing') }}</a>
        </div>

        <!-- CTA + Hamburger -->
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <NuxtLink
            to="/login"
            class="hidden md:block text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-150"
          >
            {{ t('landing.nav.login') }}
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="hidden md:inline-flex text-sm font-semibold text-white bg-workplace-red hover:bg-red-700 px-4 py-2 rounded-lg shadow-sm transition-all duration-150"
          >
            {{ t('landing.nav.startFree') }}
          </NuxtLink>
          <!-- Mobile hamburger -->
          <button
            type="button"
            class="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            :aria-label="mobileMenuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <XMarkIcon v-if="mobileMenuOpen" class="w-5 h-5" />
            <Bars3Icon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile drawer -->
      <Transition name="mobile-menu">
        <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div class="px-4 py-4 space-y-1">
            <a
              href="#features"
              class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.features') }}</a>
            <a
              href="#how"
              class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.how') }}</a>
            <a
              href="#testimonials"
              class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.testimonials') }}</a>
            <a
              href="#pricing"
              class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.pricing') }}</a>
          </div>
          <div class="px-4 pb-4 pt-2 border-t border-gray-100 flex flex-col gap-2">
            <NuxtLink
              to="/login"
              class="block text-center text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.login') }}</NuxtLink>
            <NuxtLink
              to="/register"
              class="block text-center text-sm font-semibold text-white bg-workplace-red hover:bg-red-700 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150"
              @click="mobileMenuOpen = false"
            >{{ t('landing.nav.startFree') }}</NuxtLink>
          </div>
        </div>
      </Transition>
    </nav>

    <!-- ─── Hero ───────────────────────────────────────────────────────────── -->
    <section class="pt-28 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Background blobs -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-50 via-red-100/50 to-transparent rounded-full blur-3xl opacity-60"></div>
        <div class="absolute bottom-0 -left-20 w-96 h-96 bg-gradient-to-tr from-orange-50 to-transparent rounded-full blur-3xl opacity-40"></div>
      </div>

      <div class="max-w-7xl mx-auto relative">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Text -->
          <div class="space-y-8">
            <div class="space-y-4">
              <div class="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-workplace-red text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                <span class="w-1.5 h-1.5 bg-workplace-red rounded-full animate-pulse"></span>
                {{ t('landing.hero.badge') }}
              </div>
              <h1 class="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
                {{ t('landing.hero.titleLine1') }}<br/>
                {{ t('landing.hero.titleLine2') }}<br/>
                <span class="text-workplace-red">{{ t('landing.hero.titleHighlight') }}</span>
              </h1>
              <p class="text-lg text-gray-500 leading-relaxed max-w-lg">
                {{ t('landing.hero.description') }}
              </p>
            </div>

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3">
              <NuxtLink
                to="/register"
                class="inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
              >
                {{ t('landing.hero.createFreeAccount') }}
                <ArrowRightIcon class="w-4 h-4" />
              </NuxtLink>
              <button
                type="button"
                :aria-label="t('landing.hero.viewDemoAria')"
                class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
                @click="openDemo"
              >
                <PlayIcon class="w-4 h-4 text-workplace-red" />
                {{ t('landing.hero.viewDemo') }}
              </button>
            </div>

            <!-- Trust badges -->
            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400">
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                {{ t('landing.hero.noCreditCard') }}
              </span>
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                {{ t('landing.hero.setupIn5Min') }}
              </span>
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                {{ t('landing.hero.support247') }}
              </span>
            </div>
          </div>

          <!-- Stats panel (mock dashboard preview) -->
          <div class="relative hidden lg:block">
            <!-- Main card -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-5">
              <!-- Header -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-gray-400 font-medium">{{ t('landing.hero.panelTitle') }}</p>
                  <p class="font-black text-gray-900 text-lg">{{ t('landing.hero.panelRestaurant') }}</p>
                </div>
                <div class="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  {{ t('landing.hero.online') }}
                </div>
              </div>

              <!-- KPI row -->
              <div class="grid grid-cols-3 gap-3">
                <div v-for="kpi in heroKpis" :key="kpi.label" class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p class="text-xs text-gray-400 mb-1">{{ kpi.label }}</p>
                  <p class="font-black text-gray-900 text-xl">{{ kpi.value }}</p>
                  <p class="text-xs font-semibold mt-1" :class="kpi.trend > 0 ? 'text-green-500' : 'text-red-500'">
                    {{ kpi.trend > 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend) }}%
                  </p>
                </div>
              </div>

              <!-- Mini bar chart (animated on mount) -->
              <div>
                <p class="text-xs text-gray-400 font-medium mb-3">{{ t('landing.hero.revenueThisWeek') }}</p>
                <div class="flex items-end gap-1.5 h-16">
                  <div
                    v-for="(bar, i) in chartBars"
                    :key="i"
                    class="flex-1 rounded-t-md transition-all duration-700 ease-out"
                    :class="i === chartBars.length - 1 ? 'bg-workplace-red' : 'bg-gray-100'"
                    :style="{ height: chartAnimated ? `${bar}%` : '4%', transitionDelay: `${i * 80}ms` }"
                  ></div>
                </div>
                <div class="flex justify-between mt-1.5">
                  <span v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d" class="text-[10px] text-gray-300 flex-1 text-center">{{ d }}</span>
                </div>
              </div>

              <!-- Recent orders -->
              <div>
                <p class="text-xs text-gray-400 font-medium mb-3">{{ t('landing.hero.recentOrders') }} <span class="text-[10px] text-gray-300 font-normal">{{ t('landing.hero.demoTag') }}</span></p>
                <div class="space-y-2">
                  <div v-for="order in heroOrders" :key="order.id" class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {{ order.initials }}
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-gray-700">{{ order.name }}</p>
                        <p class="text-[10px] text-gray-400">{{ order.time }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-gray-900">{{ order.amount }}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="order.statusClass">{{ order.status }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating badge -->
            <div class="absolute -bottom-5 -left-6 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
              <div class="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon class="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p class="text-xs text-gray-400">{{ t('landing.hero.salesToday') }}</p>
                <p class="text-sm font-black text-gray-900">+$4,280 <span class="text-green-500 font-bold">↑12%</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Social proof strip ─────────────────────────────────────────────── -->
    <div class="border-y border-gray-100 bg-gray-50 py-5">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-x-12 gap-y-4 items-center">
        <!-- Skeleton while loading -->
        <template v-if="loadingContent">
          <div v-for="n in 5" :key="n" class="text-center space-y-1.5">
            <div class="h-7 w-16 bg-gray-200 rounded-md animate-pulse mx-auto"></div>
            <div class="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto"></div>
          </div>
        </template>
        <template v-else>
          <div v-for="stat in socialStats" :key="stat.label" class="text-center">
            <p class="text-2xl font-black text-gray-900">{{ stat.value }}</p>
            <p class="text-xs text-gray-500 font-medium mt-0.5">{{ stat.label }}</p>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── Features ───────────────────────────────────────────────────────── -->
    <section id="features" class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.features.tag') }}</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.features.title') }}</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">{{ t('landing.features.subtitle') }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="(feature, idx) in features"
            :key="feature.title"
            class="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all duration-200 cursor-default feature-card"
            :data-index="idx"
          >
            <div :class="['w-11 h-11 rounded-xl flex items-center justify-center mb-5', feature.bg]">
              <component :is="feature.icon" class="w-5 h-5 text-white" />
            </div>
            <h3 class="font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Pricing ────────────────────────────────────────────────────────── -->
    <section id="pricing" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.pricing.tag') }}</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.pricing.title') }}</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">{{ t('landing.pricing.subtitle') }}</p>
        </div>

        <!-- Skeleton while loading -->
        <div v-if="loadingPlans" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm space-y-4 animate-pulse">
            <div class="h-4 w-20 bg-gray-200 rounded"></div>
            <div class="h-8 w-28 bg-gray-200 rounded"></div>
            <div class="space-y-2 pt-2">
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-4/5"></div>
              <div class="h-3 bg-gray-100 rounded w-3/5"></div>
            </div>
            <div class="h-10 bg-gray-100 rounded-xl mt-4"></div>
          </div>
        </div>

        <!-- Empty state (no plans configured yet) -->
        <div v-else-if="publicPlans.length === 0" class="text-center py-12">
          <p class="text-gray-400 text-sm">{{ t('landing.pricing.comingSoon') }}</p>
        </div>

        <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="plan in publicPlans"
            :key="plan.id"
            class="relative bg-white rounded-2xl p-7 border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
            :class="plan.isPopular ? 'border-workplace-red ring-1 ring-workplace-red' : 'border-gray-100'"
          >
            <span
              v-if="plan.isPopular"
              class="absolute -top-3 left-1/2 -translate-x-1/2 bg-workplace-red text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide"
            >
              {{ t('landing.pricing.mostPopular') }}
            </span>

            <p class="text-sm font-bold text-gray-500 uppercase tracking-wide">{{ plan.name }}</p>
            <p class="mt-2">
              <span class="text-3xl font-black text-gray-900">{{ formatPlanPrice(plan.price) }}</span>
              <span v-if="plan.price > 0" class="text-gray-400 text-sm font-medium">{{ t('landing.pricing.perMonth') }}</span>
            </p>
            <p v-if="plan.description" class="text-sm text-gray-500 mt-2 leading-relaxed">{{ plan.description }}</p>

            <ul class="space-y-2.5 mt-5 flex-1">
              <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2 text-sm text-gray-600">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5] flex-shrink-0 mt-0.5" />
                {{ feat }}
              </li>
            </ul>

            <NuxtLink
              to="/register"
              class="mt-6 inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl transition-all duration-150 text-sm"
              :class="plan.isPopular
                ? 'bg-workplace-red hover:bg-red-700 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'"
            >
              {{ t('landing.pricing.startNow') }}
              <ArrowRightIcon class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── How it works ───────────────────────────────────────────────────── -->
    <section id="how" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.how.tag') }}</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.how.title') }}</h2>
          <p class="text-gray-500 text-lg">{{ t('landing.how.subtitle') }}</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 relative">
          <!-- Connecting line (desktop): spans between centers of the 3 icon boxes -->
          <div class="hidden md:block absolute top-10 h-px bg-gray-200" style="left: calc(16.67% + 40px); right: calc(16.67% + 40px);"></div>

          <div v-for="(step, i) in steps" :key="i" class="flex flex-col items-center text-center space-y-4 relative">
            <div class="w-20 h-20 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm relative z-10">
              <component :is="step.icon" class="w-8 h-8 text-workplace-red" />
            </div>
            <div class="w-7 h-7 bg-workplace-red text-white rounded-full flex items-center justify-center text-xs font-black -mt-2 shadow-sm">
              {{ i + 1 }}
            </div>
            <div class="space-y-1.5">
              <h3 class="font-bold text-gray-900">{{ step.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ step.desc }}</p>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <NuxtLink
            to="/register"
            class="inline-flex items-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150"
          >
            {{ t('landing.how.startNowFree') }}
            <ArrowRightIcon class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ─── Testimonials ───────────────────────────────────────────────────── -->
    <section id="testimonials" class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.testimonials.tag') }}</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.testimonials.title') }}</h2>
        </div>

        <!-- Skeleton while loading -->
        <div v-if="loadingContent" class="grid md:grid-cols-3 gap-6">
          <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 animate-pulse">
            <div class="flex gap-1">
              <div v-for="s in 5" :key="s" class="w-4 h-4 bg-gray-200 rounded"></div>
            </div>
            <div class="space-y-2">
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-4/5"></div>
              <div class="h-3 bg-gray-100 rounded w-3/5"></div>
            </div>
            <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
              <div class="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0"></div>
              <div class="space-y-1.5">
                <div class="h-3 bg-gray-200 rounded w-24"></div>
                <div class="h-2.5 bg-gray-100 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="grid md:grid-cols-3 gap-6">
          <div
            v-for="t in testimonials"
            :key="t.name"
            class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
          >
            <!-- Stars -->
            <div class="flex gap-0.5">
              <StarIcon v-for="n in 5" :key="n" class="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <p class="text-gray-600 text-sm leading-relaxed italic">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" :style="{ backgroundColor: t.avatarColor }">
                {{ t.initials }}
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ t.name }}</p>
                <p class="text-xs text-gray-400">
                  {{ t.role }}
                  <span v-if="t.createdAt"> · {{ formatTestimonialDate(t.createdAt) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA Banner ─────────────────────────────────────────────────────── -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div class="max-w-4xl mx-auto bg-gradient-to-br from-workplace-red to-red-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
        <!-- Decorative circles -->
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full"></div>

        <div class="relative space-y-6">
          <div class="space-y-3">
            <h2 class="text-3xl sm:text-4xl font-black text-white">{{ t('landing.ctaBanner.title') }}</h2>
            <p class="text-red-100 text-lg max-w-xl mx-auto">
              {{ t('landing.ctaBanner.subtitle', { count: restaurantCountLabel, appName: t('common.appName') }) }}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center gap-2 bg-white text-workplace-red font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-red-50 transition-all duration-150 text-base"
            >
              {{ t('landing.ctaBanner.createFreeAccount') }}
              <ArrowRightIcon class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 transition-all duration-150 text-base"
            >
              {{ t('landing.ctaBanner.alreadyHaveAccount') }}
            </NuxtLink>
          </div>

          <p class="text-red-200 text-sm">{{ t('landing.ctaBanner.footnote') }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="border-t border-gray-100 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <!-- Brand -->
          <div class="space-y-3">
            <AppLogo size="sm" />
            <p class="text-sm text-gray-400 max-w-xs">
              {{ t('landing.footer.tagline') }}
            </p>
            <!-- Social links (placeholders — update hrefs when accounts are live) -->
            <div class="flex items-center gap-3 pt-1">
              <a
                href="#"
                :aria-label="t('landing.footer.twitterSoon')"
                aria-disabled="true"
                class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 cursor-not-allowed"
                @click.prevent
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="#"
                :aria-label="t('landing.footer.instagramSoon')"
                aria-disabled="true"
                class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 cursor-not-allowed"
                @click.prevent
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="#"
                :aria-label="t('landing.footer.linkedinSoon')"
                aria-disabled="true"
                class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 cursor-not-allowed"
                @click.prevent
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Links -->
          <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
            <a href="#features" :aria-label="t('landing.nav.featuresAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.features') }}</a>
            <a href="#how" :aria-label="t('landing.nav.howAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.how') }}</a>
            <a href="#pricing" :aria-label="t('landing.nav.pricingAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.pricing') }}</a>
            <NuxtLink to="/privacidad" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.footer.privacy') }}</NuxtLink>
            <NuxtLink to="/terminos" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.footer.terms') }}</NuxtLink>
            <NuxtLink to="/soporte" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.footer.support') }}</NuxtLink>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          {{ t('landing.footer.copyright', { year: currentYear, appName: t('common.appName') }) }}
        </div>
      </div>
    </footer>

    <!-- ─── Demo Modal ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDemo"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          @click.self="closeDemo"
        >
          <div
            ref="demoModalRef"
            class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            tabindex="-1"
          >
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 id="demo-modal-title" class="font-bold text-gray-900">{{ t('landing.demoModal.title') }}</h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ t('landing.demoModal.subtitle') }}</p>
              </div>
              <button
                ref="demoCloseRef"
                type="button"
                :aria-label="t('landing.demoModal.close')"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
                @click="closeDemo"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Modal body (scrollable) -->
            <div class="p-6 space-y-5 overflow-y-auto">
              <!-- Preview image placeholder -->
              <div class="w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <PlayIcon class="w-7 h-7 text-workplace-red" />
                </div>
                <p class="text-sm font-semibold text-gray-700">{{ t('landing.demoModal.videoSoon') }}</p>
                <p class="text-xs text-gray-400 text-center max-w-xs">{{ t('landing.demoModal.meanwhile') }}</p>
              </div>

              <!-- Feature highlights -->
              <div class="grid grid-cols-2 gap-3">
                <div v-for="feat in demoHighlights" :key="feat.label" class="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div :class="['w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', feat.bg]">
                    <component :is="feat.icon" class="w-3.5 h-3.5 text-white" />
                  </div>
                  <span class="text-xs font-semibold text-gray-700">{{ feat.label }}</span>
                </div>
              </div>
            </div>

            <!-- Modal footer -->
            <div class="flex flex-col sm:flex-row gap-2.5 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <NuxtLink
                to="/register"
                class="flex-1 inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
                @click="closeDemo"
              >
                {{ t('landing.demoModal.createFreeAccount') }}
                <ArrowRightIcon class="w-4 h-4" />
              </NuxtLink>
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
                @click="closeDemo"
              >
                {{ t('landing.demoModal.keepExploring') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  TruckIcon,
  ArrowRightIcon,
  CheckIcon,
  PlayIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  CogIcon,
  RocketLaunchIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'

definePageMeta({ layout: false })

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl as string

function formatTestimonialDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
}

// ─── SEO ──────────────────────────────────────────────────────────────────────

const {
  stats: socialStats,
  testimonials,
  features: dynamicFeatures,
  steps: dynamicSteps,
  loading: loadingContent,
  load: loadLandingContent,
  connectRealtime: connectLandingRealtime,
  disconnectRealtime: disconnectLandingRealtime,
} = useLandingContent()

// Resuelve el nombre de ícono (string, desde el backend) al componente Heroicons real
const ICON_MAP: Record<string, typeof ShoppingCartIcon> = {
  ShoppingCartIcon, CubeIcon, ChartBarIcon, DocumentTextIcon, UsersIcon, TruckIcon,
  UserPlusIcon, CogIcon, RocketLaunchIcon,
}
function resolveIcon(name: string) {
  return ICON_MAP[name] ?? ShoppingCartIcon
}

// ─── Pricing (planes públicos desde el backend) ──────────────────────────────
const { plans: publicPlans, loading: loadingPlans, fetchPublicPlans, formatPrice: formatPlanPrice } = usePlans()

const ratingCount = computed(() => {
  const ratingStat = socialStats.value.find(s => s.key === 'rating')
  // rawValue is guaranteed to be numeric; never use .value which may contain '4.9★'
  return String(ratingStat?.rawValue ?? 500)
})

useHead(() => ({
  title: t('landing.seo.title'),
  meta: [
    { name: 'description', content: t('landing.seo.description') },
    { name: 'keywords', content: t('landing.seo.keywords') },
    { property: 'og:site_name', content: t('common.appName') },
    { property: 'og:title', content: t('landing.seo.title') },
    { property: 'og:description', content: t('landing.seo.ogDescription') },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteUrl },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: t('common.appName') },
    { name: 'twitter:description', content: t('landing.seo.twitterDescription') },
  ],
  link: [{ rel: 'canonical', href: siteUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t('common.appName'),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: t('landing.seo.schemaDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: t('landing.seo.freePlanAvailable'),
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: ratingCount.value,
        },
      }),
    },
  ],
}))

// ─── SSR-safe currentYear ─────────────────────────────────────────────────────
const currentYear = useState('currentYear', () => new Date().getFullYear())

// ─── JS-ready flag (prevents feature cards being invisible without JS) ────────
const jsReady = ref(false)

// ─── Mobile menu ─────────────────────────────────────────────────────────────
const mobileMenuOpen = ref(false)

// ─── Hero chart animation ─────────────────────────────────────────────────────
const chartAnimated = ref(false)

// ─── Demo modal + focus trap ──────────────────────────────────────────────────
const showDemo = ref(false)
const demoModalRef = ref<HTMLElement | null>(null)
const demoCloseRef = ref<HTMLElement | null>(null)

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function trapFocus(e: KeyboardEvent) {
  if (!demoModalRef.value) return
  const focusable = Array.from(demoModalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (mobileMenuOpen.value) { mobileMenuOpen.value = false; return }
    closeDemo()
  }
  if (e.key === 'Tab' && showDemo.value) trapFocus(e)
}

async function openDemo() {
  showDemo.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  // Focus the close button (better UX than focusing the container)
  demoCloseRef.value?.focus()
}

function closeDemo() {
  showDemo.value = false
  document.body.style.overflow = ''
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  disconnectLandingRealtime()
})

// ─── Dynamic landing content ──────────────────────────────────────────────────
onMounted(async () => {
  jsReady.value = true
  loadLandingContent()
  fetchPublicPlans()
  connectLandingRealtime()

  // Animate hero chart bars after a short delay
  setTimeout(() => { chartAnimated.value = true }, 200)

  // Wait for DOM to be fully painted before observing
  await nextTick()

  // IntersectionObserver for feature card scroll-in animations
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const idx = Number(el.dataset.index ?? 0)
            setTimeout(() => {
              el.classList.add('feature-visible')
            }, idx * 80)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('.feature-card').forEach(el => observer.observe(el))
  }

  // Global keydown: Escape closes mobile menu or demo modal
  window.addEventListener('keydown', handleKeydown)
})

// ─── CTA banner restaurantCountLabel ─────────────────────────────────────────
// Uses stat key for stability (admin can rename labels without breaking this)
const restaurantCountLabel = computed(() => {
  const restaurantStat = socialStats.value.find(s => s.key === 'restaurants')
  if (!restaurantStat) return t('landing.ctaBanner.moreThanFallback')
  // Strip trailing + to avoid "more than 500+" — the phrase already implies "more than"
  const cleanValue = restaurantStat.value.replace(/\+$/, '')
  return t('landing.ctaBanner.moreThan', { value: cleanValue })
})

// ─── Hero mock data ──────────────────────────────────────────────────────────

const heroKpis = computed(() => [
  { label: t('landing.hero.salesToday'), value: '$4.2k', trend: 12 },
  { label: t('landing.hero.kpiOrders'), value: '38', trend: 8 },
  { label: t('landing.hero.kpiCustomers'), value: '124', trend: -3 },
])

const chartBars = [45, 62, 55, 78, 70, 88, 100]

const heroOrders = computed(() => [
  { id: 1, initials: 'JG', name: 'Juan García', time: t('landing.hero.minutesAgo', { minutes: 2 }), amount: '$320', status: t('landing.hero.orderStatusNew'), statusClass: 'bg-blue-50 text-blue-600' },
  { id: 2, initials: 'ML', name: 'María López', time: t('landing.hero.minutesAgo', { minutes: 8 }), amount: '$185', status: t('landing.hero.orderStatusPreparing'), statusClass: 'bg-yellow-50 text-yellow-600' },
  { id: 3, initials: 'CR', name: 'Carlos R.', time: t('landing.hero.minutesAgo', { minutes: 15 }), amount: '$560', status: t('landing.hero.orderStatusReady'), statusClass: 'bg-green-50 text-green-600' },
])

// ─── Demo modal highlights ────────────────────────────────────────────────────

const demoHighlights = computed(() => [
  { label: t('landing.demoModal.highlightOrders'), icon: ShoppingCartIcon, bg: 'bg-blue-500' },
  { label: t('landing.demoModal.highlightInventory'), icon: CubeIcon, bg: 'bg-violet-500' },
  { label: t('landing.demoModal.highlightAnalytics'), icon: ChartBarIcon, bg: 'bg-amber-500' },
  { label: t('landing.demoModal.highlightCrm'), icon: UsersIcon, bg: 'bg-pink-500' },
])

// ─── Features (dinámico desde backend, con fallback) ─────────────────────────

const features = computed(() =>
  dynamicFeatures.value.map(f => ({
    title: f.title,
    description: f.description,
    icon: resolveIcon(f.icon),
    bg: f.bg,
  }))
)

// ─── How it works (dinámico desde backend, con fallback) ─────────────────────

const steps = computed(() =>
  dynamicSteps.value.map(s => ({
    icon: resolveIcon(s.icon),
    title: s.title,
    desc: s.desc,
  }))
)
</script>

<style scoped>
/* Modal fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile menu slide */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
}
.mobile-menu-enter-to,
.mobile-menu-leave-from {
  opacity: 1;
  max-height: 600px;
}

/* Feature card scroll-in animation — only hide when JS is active (noscript/bots see cards normally) */
.js-ready .feature-card {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.js-ready .feature-card.feature-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
