<template>
  <div class="relative">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useNuxtApp } from '#app'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  options: {
    type: Object,
    default: () => ({})
  },
  height: {
    type: Number,
    default: 300
  }
})

const chartRef = ref(null)
let chartInstance = null

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20
      }
    }
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 10
      },
      grid: {
        display: false
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        maxTicksLimit: 6
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  }
}

onMounted(async () => {
  await nextTick()
  if (chartRef.value) {
    const ctx = chartRef.value.getContext('2d')
    const { $chart } = useNuxtApp()
    const Chart = await $chart()

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: props.data,
      options: { ...defaultOptions, ...props.options }
    })
  }
})

watch(() => props.data, (newData) => {
  if (chartInstance) {
    chartInstance.data = newData
    chartInstance.update()
  }
}, { deep: true })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>