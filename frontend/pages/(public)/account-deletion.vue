<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-8">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-red-500 to-orange-400" />
      <div class="px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900">Eliminar tu cuenta de WorkPlace</h1>
        <p class="text-gray-500 mt-3 leading-relaxed">
          Puedes eliminar tu cuenta y tus datos personales en cualquier momento, desde la app
          Android o desde la web.
        </p>
      </div>
    </div>

    <div
      v-if="done"
      class="flex items-start gap-3 px-6 py-5 bg-green-50 border border-green-200 rounded-2xl text-green-900"
    >
      <CheckCircleIcon class="h-6 w-6 flex-shrink-0" />
      <div>
        <p class="font-semibold">Tu cuenta fue eliminada.</p>
        <p class="text-sm mt-1">Cerramos tu sesión en todos los dispositivos. Gracias por haber usado WorkPlace.</p>
      </div>
    </div>

    <section class="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Cómo eliminarla</h2>
      <ol class="list-decimal pl-5 space-y-2 text-gray-700">
        <li>Inicia sesión en la app o en la web.</li>
        <li>Abre <strong>Mi perfil</strong> y baja hasta <strong>Eliminar cuenta</strong>.</li>
        <li>Escribe <span class="font-mono text-red-700">ELIMINAR</span> y confirma.</li>
      </ol>
      <NuxtLink
        v-if="!done"
        :to="profileLink"
        class="inline-block px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow transition-colors"
      >
        {{ isAuthenticated ? 'Ir a eliminar mi cuenta' : 'Iniciar sesión para eliminar mi cuenta' }}
      </NuxtLink>
      <p class="text-sm text-gray-500">
        ¿No puedes iniciar sesión? Escríbenos desde el email de tu cuenta a
        <a href="mailto:privacidad@workplace-manager.app" class="text-red-600 font-medium">privacidad@workplace-manager.app</a>
        con el asunto «Eliminar cuenta». Verificamos la identidad y la eliminamos en un plazo máximo de 30 días.
      </p>
    </section>

    <section class="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 space-y-3">
      <h2 class="text-lg font-semibold text-gray-900">Qué se elimina</h2>
      <ul class="list-disc pl-5 space-y-1 text-gray-700">
        <li>Nombre, email, teléfono, fecha de nacimiento, sexo y ubicación.</li>
        <li>Foto de perfil, portada, publicaciones e imágenes de tus servicios.</li>
        <li>Documentos de verificación de identidad (KYC).</li>
        <li>Seguidores, notificaciones, dispositivos y sesiones abiertas.</li>
      </ul>
      <h2 class="text-lg font-semibold text-gray-900 pt-2">Qué se conserva</h2>
      <p class="text-gray-700">
        Por obligaciones legales y contables conservamos, sin datos que te identifiquen, los registros
        de movimientos de dinero, pagos protegidos, comisiones y comprobantes de depósito. Las reseñas
        que dejaste a otros usuarios se mantienen firmadas como «Usuario eliminado».
      </p>
      <p class="text-gray-700">
        Si tienes pagos protegidos en curso, estados de cuenta sin pagar o un retiro en proceso, tendrás que
        resolverlos antes: la app te indica cuáles.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'

definePageMeta({ layout: 'public' })
useHead({ title: 'Eliminar cuenta — WorkPlace' })

const route = useRoute()
const { isAuthenticated } = useAuth()
const done = computed(() => route.query.done === '1')
const profileLink = computed(() =>
  isAuthenticated.value
    ? '/profile?tab=delete-account'
    : `/login?redirect=${encodeURIComponent('/profile?tab=delete-account')}`,
)
</script>
