import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
}

export interface Expense {
  id: number;
  amount: number;
  description: string | null;
  category_id: number | null;
  date: string;
  created_at: string;
}

export interface MonthlyBudget {
  id: number;
  month: string;
  amount: number;
}

const KEYS = {
  categories: '@categories',
  expenses: '@expenses',
  budgets: '@monthly_budgets',
  expensesCounter: '@next_expense_id',
  budgetsCounter: '@next_budget_id',
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Alimentación', icon: 'cart', color: '#ef4444', is_default: true },
  { id: 2, name: 'Transporte', icon: 'bus', color: '#f59e0b', is_default: true },
  { id: 3, name: 'Vivienda', icon: 'house', color: '#8b5cf6', is_default: true },
  { id: 4, name: 'Servicios', icon: 'bolt', color: '#06b6d4', is_default: true },
  { id: 5, name: 'Salud', icon: 'heart', color: '#ec4899', is_default: true },
  { id: 6, name: 'Entretenimiento', icon: 'gamepad', color: '#10b981', is_default: true },
  { id: 7, name: 'Ropa', icon: 'tag', color: '#f97316', is_default: true },
  { id: 8, name: 'Educación', icon: 'book', color: '#3b82f6', is_default: true },
  { id: 9, name: 'Ahorro', icon: 'bank', color: '#14b8a6', is_default: true },
  { id: 10, name: 'Otros', icon: 'more', color: '#64748b', is_default: true },
];

async function seedIfEmpty(): Promise<void> {
  const existing = await AsyncStorage.getItem(KEYS.categories);
  if (!existing) {
    await AsyncStorage.setItem(KEYS.categories, JSON.stringify(DEFAULT_CATEGORIES));
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify([]));
    await AsyncStorage.setItem(KEYS.budgets, JSON.stringify([]));
    await AsyncStorage.setItem(KEYS.expensesCounter, '1000');
    await AsyncStorage.setItem(KEYS.budgetsCounter, '100');
  }
}

async function getNextId(counterKey: string): Promise<number> {
  const val = await AsyncStorage.getItem(counterKey);
  const next = val ? parseInt(val, 10) + 1 : 1;
  await AsyncStorage.setItem(counterKey, String(next));
  return next;
}

export const db = {
  async init(): Promise<void> {
    await seedIfEmpty();
  },

  async getCategories(): Promise<Category[]> {
    const raw = await AsyncStorage.getItem(KEYS.categories);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  },

  async getExpenses({ month }: { month: string }): Promise<Expense[]> {
    const raw = await AsyncStorage.getItem(KEYS.expenses);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const monthStart = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);
    return all
      .filter((e) => e.date >= monthStart && e.date < nextMonth)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getAllExpenses(): Promise<Expense[]> {
    const raw = await AsyncStorage.getItem(KEYS.expenses);
    return raw ? JSON.parse(raw) : [];
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const raw = await AsyncStorage.getItem(KEYS.expenses);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const newExpense: Expense = {
      ...expense,
      id: await getNextId(KEYS.expensesCounter),
      created_at: new Date().toISOString(),
    };
    all.push(newExpense);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(all));
    return newExpense;
  },

  async deleteExpense(id: number): Promise<void> {
    const raw = await AsyncStorage.getItem(KEYS.expenses);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((e) => e.id !== id);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(filtered));
  },

  async getBudget(month: string): Promise<MonthlyBudget | null> {
    const raw = await AsyncStorage.getItem(KEYS.budgets);
    const all: MonthlyBudget[] = raw ? JSON.parse(raw) : [];
    return all.find((b) => b.month === month) ?? null;
  },

  async setBudget(amount: number, month: string): Promise<MonthlyBudget> {
    const raw = await AsyncStorage.getItem(KEYS.budgets);
    const all: MonthlyBudget[] = raw ? JSON.parse(raw) : [];
    const existing = all.find((b) => b.month === month);
    if (existing) {
      existing.amount = amount;
      await AsyncStorage.setItem(KEYS.budgets, JSON.stringify(all));
      return existing;
    }
    const newBudget: MonthlyBudget = {
      id: await getNextId(KEYS.budgetsCounter),
      month,
      amount,
    };
    all.push(newBudget);
    await AsyncStorage.setItem(KEYS.budgets, JSON.stringify(all));
    return newBudget;
  },
};
