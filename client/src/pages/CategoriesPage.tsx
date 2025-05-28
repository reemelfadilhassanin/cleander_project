import { useState } from 'react';
import { useLocation } from 'wouter';
import { PlusSquare, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCategories, Category } from '@/context/CategoryContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Color map to translate color names to Tailwind classes
const colorMap: Record<string, string> = {
  red: 'bg-red-500 hover:bg-red-600',
  green: 'bg-green-500 hover:bg-green-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
  pink: 'bg-pink-500 hover:bg-pink-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  teal: 'bg-teal-500 hover:bg-teal-600',
};

// Text color based on background color
const textColorMap: Record<string, string> = {
  yellow: 'text-black',
  default: 'text-white'
};

export default function CategoriesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { categories, deleteCategory } = useCategories();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleEditCategory = (category: Category) => {
    // Navigate to edit page with category id
    navigate(`/edit-category/${category.id}`);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      // Delete the category
      deleteCategory(categoryToDelete.id);
      
      toast({
        title: "تم حذف القسم",
        description: `تم حذف قسم ${categoryToDelete.name} بنجاح`,
      });
      
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto p-4 mb-16" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">الأقسام</h1>
        <Button
          onClick={() => navigate('/add-category')}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          <PlusSquare className="h-5 w-5" />
          إضافة قسم
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={`${colorMap[category.color] || 'bg-gray-500'} ${textColorMap[category.color] || textColorMap.default} transition-all transform hover:scale-[1.02] overflow-hidden`}
          >
            <CardContent className="p-0">
              <div className="relative">
                <div className="p-6">
                  <h3 className="text-xl font-bold">{category.name}</h3>
                  {category.default && (
                    <div className="mt-2 inline-block px-2 py-1 text-xs bg-white/30 rounded-md">
                      افتراضي
                    </div>
                  )}
                </div>
                
                <div className="absolute top-2 left-2 flex space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!category.default && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
                      onClick={() => handleDeleteClick(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا القسم؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف قسم "{categoryToDelete?.name}" نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}