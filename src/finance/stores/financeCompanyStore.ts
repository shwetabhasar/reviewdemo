// src/finance/stores/financeCompanyStore.ts
import { create } from 'zustand';
import { IFinanceCompany } from 'finance/types/IFinanceCompany';

interface FinanceCompanyStore {
  financeCompanies: IFinanceCompany[];
  isLoading: boolean;
  selectedCompany: IFinanceCompany | null;
  setFinanceCompanies: (companies: IFinanceCompany[]) => void;
  setLoading: (isLoading: boolean) => void;
  setSelectedCompany: (company: IFinanceCompany | null) => void;
  deleteFinanceCompany: (id: string) => void;
  updateFinanceCompany: (id: string, data: Partial<IFinanceCompany>) => void;
}

export const useFinanceCompanyStore = create<FinanceCompanyStore>((set) => ({
  financeCompanies: [],
  isLoading: false,
  selectedCompany: null,
  setFinanceCompanies: (companies) => set({ financeCompanies: companies }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  deleteFinanceCompany: (id) =>
    set((state) => ({
      financeCompanies: state.financeCompanies.filter((company) => company.id !== id)
    })),
  updateFinanceCompany: (id, data) =>
    set((state) => ({
      financeCompanies: state.financeCompanies.map((company) => (company.id === id ? { ...company, ...data } : company))
    }))
}));
