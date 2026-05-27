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
  type: 'expense' | 'income';
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

export interface MonthSummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  byCategory: { category_name: string; total: number; color: string }[];
  expenseCount: number;
  dailyAverage: number;
  topExpenses: Expense[];
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

function getMonthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(y, m, 1).toISOString().slice(0, 10);
  return { start, end };
}

function getAll(raw: string | null): Expense[] {
  return raw ? JSON.parse(raw) : [];
}

async function saveAll(items: Expense[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(items));
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
    const all = getAll(await AsyncStorage.getItem(KEYS.expenses));
    const { start, end } = getMonthBounds(month);
    return all
      .filter((e) => e.date >= start && e.date < end)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getAllExpenses(): Promise<Expense[]> {
    return getAll(await AsyncStorage.getItem(KEYS.expenses));
  },

  async searchExpenses({ month, query }: { month: string; query: string }): Promise<Expense[]> {
    const all = getAll(await AsyncStorage.getItem(KEYS.expenses));
    const { start, end } = getMonthBounds(month);
    const q = query.toLowerCase();
    return all
      .filter((e) => e.date >= start && e.date < end)
      .filter((e) => {
        if (!q) return true;
        return (
          e.description?.toLowerCase().includes(q) ||
          String(e.amount).includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getMonthSummary(month: string): Promise<MonthSummary> {
    const [expenses, categories] = await Promise.all([
      this.getExpenses({ month }),
      this.getCategories(),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const incomeItems = expenses.filter((e) => e.type === 'income');
    const expenseItems = expenses.filter((e) => e.type === 'expense');

    const totalIncome = incomeItems.reduce((s, e) => s + Number(e.amount), 0);
    const totalExpenses = expenseItems.reduce((s, e) => s + Number(e.amount), 0);

    const byCategoryMap: Record<string, { total: number; color: string }> = {};
    expenseItems.forEach((e) => {
      const name = e.category_id ? catMap.get(e.category_id)?.name : undefined;
      const label = name || 'Sin categoría';
      const cat = e.category_id ? catMap.get(e.category_id) : undefined;
      if (!byCategoryMap[label]) byCategoryMap[label] = { total: 0, color: cat?.color ?? '#64748b' };
      byCategoryMap[label].total += Number(e.amount);
    });

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = Math.min(now.getDate(), daysInMonth);

    const sorted = [...expenseItems].sort((a, b) => Number(b.amount) - Number(a.amount));

    return {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      byCategory: Object.entries(byCategoryMap).map(([k, v]) => ({ category_name: k, ...v })),
      expenseCount: expenseItems.length,
      dailyAverage: day > 0 ? totalExpenses / day : 0,
      topExpenses: sorted.slice(0, 5),
    };
  },

  async getPreviousMonthSummary(): Promise<MonthSummary | null> {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = prev.toISOString().slice(0, 7);
    const items = await this.getExpenses({ month });
    if (items.length === 0) return null;
    return this.getMonthSummary(month);
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const all = getAll(await AsyncStorage.getItem(KEYS.expenses));
    const newExpense: Expense = {
      ...expense,
      id: await getNextId(KEYS.expensesCounter),
      created_at: new Date().toISOString(),
    };
    all.push(newExpense);
    await saveAll(all);
    return newExpense;
  },

  async updateExpense(id: number, updates: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<Expense | null> {
    const all = getAll(await AsyncStorage.getItem(KEYS.expenses));
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    await saveAll(all);
    return all[idx];
  },

  async deleteExpense(id: number): Promise<void> {
    const all = getAll(await AsyncStorage.getItem(KEYS.expenses));
    await saveAll(all.filter((e) => e.id !== id));
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
