import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Category type
export interface Category {
  id: string;
  name: string;
  color: string;
  default?: boolean;
}

// Initial categories
const initialCategories: Category[] = [
  { id: 'all', name: 'الكل', color: 'blue', default: true },
  { id: '1', name: 'أعياد', color: 'green' },
  { id: '2', name: 'مناسبات شخصية', color: 'purple' },
  { id: '3', name: 'مواعيد طبية', color: 'red' },
  { id: '4', name: 'أعمال', color: 'orange' },
  { id: '5', name: 'سفر', color: 'teal' },
];

// Context type
type CategoryContextType = {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  getCategory: (id: string) => Category | undefined;
};

// Create context
export const CategoryContext = createContext<CategoryContextType>({
  categories: [],
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
  getCategory: () => undefined,
});

// Provider component
export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Add a new category
  const addCategory = (category: Omit<Category, 'id'>) => {
    const id = Date.now().toString();
    setCategories([...categories, { id, ...category }]);
  };

  // Update an existing category
  const updateCategory = (id: string, updatedCategory: Omit<Category, 'id'>) => {
    setCategories(
      categories.map((category) =>
        category.id === id 
          ? { ...category, ...updatedCategory } 
          : category
      )
    );
  };

  // Delete a category
  const deleteCategory = (id: string) => {
    setCategories(categories.filter((category) => category.id !== id));
  };

  // Get a category by ID
  const getCategory = (id: string) => {
    return categories.find((category) => category.id === id);
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

// Hook to use the category context
export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}