export const CATEGORIES = ["食費", "交通費", "日用品", "外食", "娯楽", "その他"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Expense = {
  date: Date;
  amount: number;
  category: Category;
};
