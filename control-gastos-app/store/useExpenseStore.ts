import { create } from 'zustand';
import { db, Category, Expense, MonthSummary, toLocalMonth } from '@/lib/database';

interface ExpenseState {
  summary: MonthSummary | null;
  prevSummary: MonthSummary | null;
  budgetAmount: number | null;
  categories: Category[];

  fetchDashboard: (month?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addExpense: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<Expense>;
  updateExpense: (id: number, updates: Partial<Omit<Expense, 'id' | 'created_at'>>) => Promise<Expense | null>;
  deleteExpense: (id: number) => Promise<void>;
  saveBudget: (amount: number, month: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  summary: null,
  prevSummary: null,
  budgetAmount: null,
  categories: [],

  fetchDashboard: async (month?: string) => {
    const m = month || toLocalMonth(new Date());
    const mm = `${m}-01`;
    try {
      const [summary, prevSummary, budget] = await Promise.all([
        db.getMonthSummary(m),
        db.getPreviousMonthSummary(m),
        db.getBudget(mm),
      ]);
      set({ summary, prevSummary, budgetAmount: budget ? Number(budget.amount) : null });
    } catch (err) {
      console.error(err);
    }
  },

  fetchCategories: async () => {
    const categories = await db.getCategories();
    set({ categories });
  },

  addExpense: async (data) => {
    const expense = await db.addExpense(data);
    await get().fetchDashboard();
    return expense;
  },

  updateExpense: async (id, updates) => {
    const result = await db.updateExpense(id, updates);
    await get().fetchDashboard();
    return result;
  },

  deleteExpense: async (id) => {
    await db.deleteExpense(id);
    await get().fetchDashboard();
  },

  saveBudget: async (amount, month) => {
    await db.setBudget(amount, month);
    await get().fetchDashboard();
  },
}));
