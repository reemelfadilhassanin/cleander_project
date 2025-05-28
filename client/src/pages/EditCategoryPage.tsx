import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useCategories, Category } from '@/context/CategoryContext';

// Define form schema
const categorySchema = z.object({
  name: z.string().min(2, 'اسم القسم يجب أن يكون على الأقل حرفين'),
  color: z.string().min(1, 'يجب اختيار لون للقسم'),
  default: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// Predefined colors with descriptions
const colorOptions = [
  { value: 'red', label: 'أحمر', bg: 'bg-red-500', text: 'text-white' },
  { value: 'green', label: 'أخضر', bg: 'bg-green-500', text: 'text-white' },
  { value: 'blue', label: 'أزرق', bg: 'bg-blue-500', text: 'text-white' },
  { value: 'yellow', label: 'أصفر', bg: 'bg-yellow-500', text: 'text-black' },
  { value: 'purple', label: 'بنفسجي', bg: 'bg-purple-500', text: 'text-white' },
  { value: 'pink', label: 'وردي', bg: 'bg-pink-500', text: 'text-white' },
  { value: 'orange', label: 'برتقالي', bg: 'bg-orange-500', text: 'text-white' },
  { value: 'teal', label: 'فيروزي', bg: 'bg-teal-500', text: 'text-white' },
];

export default function EditCategoryPage() {
  const params = useParams();
  const categoryId = params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { getCategory, updateCategory } = useCategories();
  const [category, setCategory] = useState<Category | null>(null);

  // Get category data on component mount
  useEffect(() => {
    if (categoryId) {
      const foundCategory = getCategory(categoryId);
      if (foundCategory) {
        setCategory(foundCategory);
      } else {
        toast({
          title: "خطأ",
          description: "القسم غير موجود",
          variant: "destructive",
        });
        navigate('/categories');
      }
    }
  }, [categoryId, navigate, toast, getCategory]);

  // Initialize form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      color: '',
      default: false
    },
  });

  // Update form values when category data is loaded
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        color: category.color,
        default: category.default || false,
      });
    }
  }, [category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);

    try {
      if (!categoryId) throw new Error("معرف القسم غير موجود");
      
      // Update the category in context
      updateCategory(categoryId, {
        name: values.name,
        color: values.color,
        default: values.default
      });
      
      // Simulate a short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "تم تعديل القسم بنجاح",
        description: `تم تعديل قسم ${values.name} بنجاح`,
      });
      
      // Navigate back to categories
      navigate('/categories');
    } catch (error) {
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تعديل القسم، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading or not found state if category is not loaded yet
  if (!category) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center">جاري تحميل بيانات القسم...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 mb-16 max-w-md" dir="rtl">
      <div className="mb-4">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate('/categories')}
        >
          <ArrowRight className="h-4 w-4" />
          العودة للأقسام
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-center">تعديل القسم</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم القسم</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم القسم" {...field} className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>لون القسم</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-4 gap-2"
                      >
                        {colorOptions.map((color) => (
                          <FormItem key={color.value}>
                            <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:ring-2">
                              <FormControl>
                                <RadioGroupItem
                                  value={color.value}
                                  className="sr-only"
                                />
                              </FormControl>
                              <div
                                className={`h-12 w-12 rounded-full ${color.bg} flex items-center justify-center ring-offset-2 ring-offset-background ${color.text}`}
                              >
                                {field.value === color.value && (
                                  <span className="text-lg">✓</span>
                                )}
                              </div>
                              <p className="text-center text-xs mt-1">{color.label}</p>
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse rtl:space-x-reverse space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        قسم افتراضي
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        هذا القسم سيكون القسم الافتراضي لجميع المناسبات الجديدة
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
                <Button 
                  type="button" 
                  className="flex-1" 
                  variant="outline"
                  onClick={() => navigate('/categories')}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}