<template>
  <div>
    <!-- <slot /> y no <NuxtPage />: con NuxtPage, al salir del login la página
         de destino se montaba primero dentro de este layout y luego otra vez
         en el suyo (doble montaje y llamadas al API duplicadas). -->
    <slot />
  </div>
</template>
