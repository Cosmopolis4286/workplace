import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const expenses = ref([
  {
    id: uuidv4(),
    description: 'Compra de ingredientes',
    amount: 450.00,
    category: 'Ingredientes',
    date: new Date('2024-01-15'),
    type: 'operativo',
    status: 'pagado',
    supplier: 'Distribuidora Central',
    receipt: 'REC-001',
    paymentMethod: 'transferencia'
  },
  {
    id: uuidv4(),
    description: 'Renta del local',
    amount: 2500.00,
    category: 'Renta',
    date: new Date('2024-01-01'),
    type: 'fijo',
    status: 'pagado',
    supplier: 'Inmobiliaria XYZ',
    receipt: 'REC-002',
    paymentMethod: 'transferencia'
  },
  {
    id: uuidv4(),
    description: 'Servicios públicos',
    amount: 180.50,
    category: 'Servicios',
    date: new Date('2024-01-10'),
    type: 'fijo',
    status: 'pendiente',
    supplier: 'CFE',
    receipt: 'REC-003',
    paymentMethod: 'efectivo'
  }
])

const expenseCategories = ref([
  { id: 1, name: 'Ingredientes', color: '#ef4444', budget: 2000 },
  { id: 2, name: 'Renta', color: '#f97316', budget: 2500 },
  { id: 3, name: 'Servicios', color: '#3b82f6', budget: 500 },
  { id: 4, name: 'Marketing', color: '#8b5cf6', budget: 800 },
  { id: 5, name: 'Personal', color: '#10b981', budget: 5000 },
  { id: 6, name: 'Equipo', color: '#f59e0b', budget: 1000 }
])

export const useExpenses = () => {
  const totalExpenses = computed(() => 
    expenses.value.reduce((sum, expense) => sum + expense.amount, 0)
  )

  const monthlyExpenses = computed(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    return expenses.value
      .filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  })

  const expensesByCategory = computed(() => {
    const categoryTotals = {}
    expenses.value.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0
      }
      categoryTotals[expense.category] += expense.amount
    })
    return categoryTotals
  })

  const pendingExpenses = computed(() => 
    expenses.value.filter(expense => expense.status === 'pendiente')
  )

  const addExpense = (expense) => {
    const newExpense = {
      ...expense,
      id: uuidv4(),
      date: new Date(expense.date)
    }
    expenses.value.push(newExpense)
    return newExpense
  }

  const updateExpense = (id, updates) => {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index !== -1) {
      expenses.value[index] = { ...expenses.value[index], ...updates }
    }
  }

  const deleteExpense = (id) => {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index !== -1) {
      expenses.value.splice(index, 1)
    }
  }

  return {
    expenses: readonly(expenses),
    expenseCategories: readonly(expenseCategories),
    totalExpenses,
    monthlyExpenses,
    expensesByCategory,
    pendingExpenses,
    addExpense,
    updateExpense,
    deleteExpense
  }
}