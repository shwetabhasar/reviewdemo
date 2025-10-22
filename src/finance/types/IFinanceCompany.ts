// src/finance/types/IFinanceCompany.ts
export interface IFinanceCompany {
  id: string | null;
  companyName: string;
  stampPath?: string;
  showroomId: string;
  isDeleted: boolean;
  createdAt: Date;
  modifiedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
}
