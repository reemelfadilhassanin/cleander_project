import { useState, useEffect } from 'react';
import { useLocation } from 'wouter'; // Link was removed as it's not used directly
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import HijriDate from 'hijri-date/lib/safe';

import {
  ArrowRight,
  Calendar,
  Clock as ClockIcon,
  Edit2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
// import { useCategories } from '@/context/CategoryContext'; // Removed as categories are fetched directly
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input'; // Assuming Input can also be used as textarea via "as" prop or similar
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const eventSchema = z.object({
  title: z.string().min(2, 'العنوان يجب أن يكون على الأقل حرفين'),
  category: z.string().min(1, 'الرجاء اختيار الفئة'),
  date: z.object({
    hijriMonth: z.number().min(1).max(12),
    hijriYear: z.number().min(1400).max(1500), // Adjust range as needed
    hijriDay: z.number().min(1).max(30), // This will be refined in onSubmit/dialog logic
  }),
  days: z.number().min(1).max(365), // This field seems unused in current form UI
  time: z.string().min(1, 'الرجاء اختيار الوقت'),
  notes: z.string().optional(),
});

// Moved todayHijri instance creation inside the component if it needs to be fresh on each mount,
// or keep it here if it's fine for it to be set once when the module loads.
// For current date placeholders, it's usually better inside or as new Date() equivalent.
// Let's re-initialize it inside for robustness, similar to how it was.

function getHijriMonthName(month: number): string {
  const hijriMonthNames = [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الثاني',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة',
  ];
  return hijriMonthNames[month - 1] || `شهر ${month}`;
}

// Removed unused hijriToGregorianApprox function

export default function AddEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHijri, setIsHijri] = useState(true); // Default to Hijri input/display
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);

  const searchString =
    typeof window !== 'undefined' ? window.location.search : '';
  const searchParams = new URLSearchParams(searchString);
  const dayParam = searchParams.get('day');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const todayHijriInstance = new HijriDate(); // Instance for current date
  const const_CURRENT_HIJRI_YEAR_PLACEHOLDER = todayHijriInstance.getFullYear();
  const const_CURRENT_HIJRI_MONTH_PLACEHOLDER =
    todayHijriInstance.getMonth() + 1; // getMonth() is 0-indexed
  const const_CURRENT_HIJRI_DAY_PLACEHOLDER = todayHijriInstance.getDate();

  const initialDay = dayParam
    ? parseInt(dayParam, 10)
    : const_CURRENT_HIJRI_DAY_PLACEHOLDER;
  const initialMonth = monthParam
    ? parseInt(monthParam, 10)
    : const_CURRENT_HIJRI_MONTH_PLACEHOLDER;
  const initialYear = yearParam
    ? parseInt(yearParam, 10)
    : const_CURRENT_HIJRI_YEAR_PLACEHOLDER;

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [maxDaysInSelectedMonth, setMaxDaysInSelectedMonth] = useState(30);

  const [_, setLocation] = useLocation();
  const [categories, setCategories] = useState<
    { id: string; name: string; color: string; default?: boolean }[]
  >([]);
  // const [categoriesLoaded, setCategoriesLoaded] = useState(false); // Removed as unused
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      category: '', // Initialize as empty, will be set by useEffect
      date: {
        hijriDay: initialDay,
        hijriMonth: initialMonth, // 1-indexed
        hijriYear: initialYear,
      },
      days: 1, // This 'days' field for event duration seems not to be in the UI
      time: '12:00',
      notes: '',
    },
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          'https://cleander-project-server.onrender.com/api/categories',
          {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!res.ok) {
          throw new Error('فشل في جلب الفئات');
        }

        const data = await res.json();
        setCategories(data);
        // setCategoriesLoaded(true); // Removed
        const currentFormCategory = form.getValues('category');
        if (!currentFormCategory && data.length > 0) {
          const defaultCat =
            data.find((cat: any) => cat.default)?.id || data[0].id;
          if (defaultCat) {
            form.setValue('category', defaultCat);
          }
        }
      } catch (error) {
        console.error('خطأ أثناء جلب الفئات:', error);
        toast({
          title: 'خطأ في تحميل الفئات',
          description: (error as Error).message || 'حدث خطأ غير متوقع.',
          variant: 'destructive',
        });
      }
    };

    fetchCategories();
  }, [form, toast]); // Added form and toast to dependency array

  // Effect to update max days when selected month/year in dialog changes
  useEffect(() => {
    try {
      // selectedMonth is 1-indexed, HijriDate constructor needs 0-indexed month
      const hijriCalendar = new HijriDate(selectedYear, selectedMonth - 1, 1);
      const days = hijriCalendar.daysInMonth();
      setMaxDaysInSelectedMonth(days);
      if (selectedDay > days) {
        setSelectedDay(days); // Adjust selectedDay if it exceeds the new max days
      }
    } catch (error) {
      console.error('Error calculating days in Hijri month:', error);
      setMaxDaysInSelectedMonth(30); // Fallback to 30 days in case of error
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  useEffect(() => {
    if (dayParam && monthParam && yearParam) {
      const day = parseInt(dayParam, 10);
      const month = parseInt(monthParam, 10); // 1-indexed from URL
      const year = parseInt(yearParam, 10);
      form.setValue('date.hijriDay', day);
      form.setValue('date.hijriMonth', month);
      form.setValue('date.hijriYear', year);
      setSelectedDay(day);
      setSelectedMonth(month);
      setSelectedYear(year);
      try {
        // month is 1-indexed, HijriDate constructor needs 0-indexed month
        const hijriCalendar = new HijriDate(year, month - 1, 1);
        setMaxDaysInSelectedMonth(hijriCalendar.daysInMonth());
      } catch (error) {
        console.error('Error setting initial max days from URL params:', error);
        setMaxDaysInSelectedMonth(30);
      }
    }
  }, [dayParam, monthParam, yearParam, form]);

  useEffect(() => {
    if (isDateDialogOpen) {
      const formDate = form.getValues().date;
      setSelectedDay(formDate.hijriDay);
      setSelectedMonth(formDate.hijriMonth); // This is 1-indexed from form
      setSelectedYear(formDate.hijriYear);
      try {
        // formDate.hijriMonth is 1-indexed, HijriDate constructor needs 0-indexed month
        const hijriCalendar = new HijriDate(
          formDate.hijriYear,
          formDate.hijriMonth - 1,
          1
        );
        setMaxDaysInSelectedMonth(hijriCalendar.daysInMonth());
      } catch (error) {
        console.error('Error setting dialog initial max days:', error);
        setMaxDaysInSelectedMonth(30);
      }
    }
  }, [isDateDialogOpen, form]);

  const addEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest('POST', '/api/events', payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إضافة المناسبة');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'تمت إضافة المناسبة بنجاح',
        description: 'تمت إضافة المناسبة إلى التقويم الخاص بك',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setLocation('/events');
      // No need to set setIsSubmitting(false) here, mutation state 'isPending' handles it
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في إضافة المناسبة',
        description: error.message,
        variant: 'destructive',
      });
      // No need to set setIsSubmitting(false) here, mutation state 'isPending' handles it
    },
  });

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    // setIsSubmitting(true); // Handled by mutation's isPending state

    if (!values.title.trim()) {
      form.setError('title', {
        type: 'manual',
        message: 'يجب إدخال عنوان للمناسبة',
      });
      return; // No need for setIsSubmitting(false)
    }

    const { hijriDay, hijriMonth, hijriYear } = values.date; // hijriMonth is 1-indexed

    let actualMaxDaysInMonth;
    try {
      // hijriMonth is 1-indexed from form, HijriDate constructor needs 0-indexed
      actualMaxDaysInMonth = new HijriDate(
        hijriYear,
        hijriMonth - 1,
        1
      ).daysInMonth();
    } catch (error) {
      console.error('Error during submission validation (daysInMonth):', error);
      toast({
        title: 'خطأ في التحقق من التاريخ',
        description: 'لا يمكن التحقق من عدد أيام الشهر.',
        variant: 'destructive',
      });
      actualMaxDaysInMonth = 30; // Fallback, consider not submitting or more specific error
      return; // Prevent submission if date validation itself fails critically
    }

    if (hijriDay > actualMaxDaysInMonth) {
      form.setError('date.hijriDay', {
        type: 'manual',
        message: `شهر ${getHijriMonthName(
          hijriMonth
        )} لا يمكن أن يكون فيه أكثر من ${actualMaxDaysInMonth} يومًا في سنة ${hijriYear}`,
      });
      return; // No need for setIsSubmitting(false)
    }

    // hijriMonth is 1-indexed from form, HijriDate constructor needs 0-indexed
    const hijriDateToConvert = new HijriDate(
      hijriYear,
      hijriMonth - 1,
      hijriDay
    );
    const gregorianDate = hijriDateToConvert.toGregorian();

    if (isNaN(gregorianDate.getTime())) {
      toast({
        title: 'خطأ في التاريخ',
        description:
          'فشل في تحويل التاريخ الهجري إلى ميلادي. تأكد من صحة اليوم والشهر والسنة.',
        variant: 'destructive',
      });
      return; // No need for setIsSubmitting(false)
    }

    const datePayloadForApi = {
      // Renamed for clarity
      hijriDay,
      hijriMonth, // 1-indexed
      hijriYear,
      gregorianDay: gregorianDate.getDate(),
      gregorianMonth: gregorianDate.getMonth() + 1, // API expects 1-indexed month
      gregorianYear: gregorianDate.getFullYear(),
    };

    const payloadToSend = {
      title: values.title,
      categoryId: values.category,
      date: datePayloadForApi,
      days: values.days, // This is from schema, ensure UI exists if needed
      time: values.time,
      notes: values.notes,
      isHijri: true, // Event is primarily Hijri as per dialog logic
    };

    // For debugging:
    // console.log('📦 Payload being sent to API:', JSON.stringify(payloadToSend, null, 2));

    addEventMutation.mutate(payloadToSend);
  };

  const handleDateDialogConfirm = () => {
    form.setValue('date.hijriDay', selectedDay);
    form.setValue('date.hijriMonth', selectedMonth); // selectedMonth is 1-indexed
    form.setValue('date.hijriYear', selectedYear);
    form.trigger('date'); // Trigger validation for the whole date object
    setIsDateDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-2xl">
      <div className="flex justify-end mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/events')}
          aria-label="العودة إلى المناسبات"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
      {form.formState.errors.root && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
          role="alert"
        >
          <p className="font-bold">خطأ</p>
          <p>{form.formState.errors.root.message}</p>
        </div>
      )}
      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-md py-4">
          <CardTitle className="text-xl text-center font-semibold">
            إضافة مناسبة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                        <Pencil className="h-4 w-4 text-blue-600" />
                        العنوان
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: اجتماع فريق العمل الأسبوعي"
                          className="text-right text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                        <Edit2 className="h-4 w-4 text-blue-600" />
                        الفئة
                      </FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        dir="rtl"
                      >
                        <FormControl>
                          <SelectTrigger className="text-right text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue
                              placeholder={
                                categories.length > 0
                                  ? 'اختر الفئة'
                                  : 'جاري تحميل الفئات...'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.length === 0 && (
                            <SelectItem value="placeholder-disabled" disabled>
                              لا توجد فئات أو جاري التحميل...
                            </SelectItem>
                          )}
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                ></span>
                                {category.name}
                                {category.default && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    (افتراضي)
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date.hijriDay" // Can be any field in date for the FormField wrapper
                  render={() => {
                    const formDateValues = form.getValues().date; // hijriMonth is 1-indexed
                    let displayGregorianDateStr = 'جاري التحويل...';
                    if (!isHijri) {
                      try {
                        const gregorianDateObj = new HijriDate(
                          formDateValues.hijriYear,
                          formDateValues.hijriMonth - 1, // Convert 1-indexed to 0-indexed
                          formDateValues.hijriDay
                        ).toGregorian();
                        if (isNaN(gregorianDateObj.getTime()))
                          throw new Error('Invalid Date from conversion');
                        displayGregorianDateStr =
                          gregorianDateObj.toLocaleDateString(
                            'ar-SA-u-nu-latn',
                            {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }
                          ) + ' م';
                      } catch (e) {
                        console.error(
                          'Error converting Hijri to Gregorian for display:',
                          e
                        );
                        displayGregorianDateStr = 'خطأ في تحويل التاريخ';
                      }
                    }
                    return (
                      <FormItem>
                        <div className="flex justify-between items-center mb-1">
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5 text-gray-700">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            التاريخ ({isHijri ? 'هجري' : 'ميلادي'})
                          </FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsHijri(!isHijri)}
                            className="text-xs px-2 py-1 border-gray-300 text-blue-600 hover:bg-blue-50"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {isHijri ? 'عرض ميلادي' : 'عرض هجري'}
                          </Button>
                        </div>
                        <div
                          className="flex items-center justify-between border border-gray-300 rounded-md p-2.5 cursor-pointer hover:border-blue-400 text-sm"
                          onClick={() => setIsDateDialogOpen(true)}
                        >
                          <span>
                            {isHijri
                              ? `${formDateValues.hijriDay} ${getHijriMonthName(
                                  formDateValues.hijriMonth
                                )} ${formDateValues.hijriYear} هـ`
                              : displayGregorianDateStr}
                          </span>
                          <Calendar className="h-4 w-4 text-gray-500" />
                        </div>
                        {form.formState.errors.date?.hijriDay && (
                          <FormMessage>
                            {form.formState.errors.date.hijriDay.message}
                          </FormMessage>
                        )}
                        {form.formState.errors.date?.hijriMonth && (
                          <FormMessage>
                            {form.formState.errors.date.hijriMonth.message}
                          </FormMessage>
                        )}
                        {form.formState.errors.date?.hijriYear && (
                          <FormMessage>
                            {form.formState.errors.date.hijriYear.message}
                          </FormMessage>
                        )}
                        {/* For a general date object error if not specific to a field */}
                        {form.formState.errors.date &&
                          typeof form.formState.errors.date.message ===
                            'string' && (
                            <FormMessage>
                              {form.formState.errors.date.message}
                            </FormMessage>
                          )}
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                        <ClockIcon className="h-4 w-4 text-blue-600" />
                        الوقت
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                        <Pencil className="h-4 w-4 text-blue-600" />{' '}
                        {/* Changed icon to Pencil */}
                        ملاحظات إضافية (اختياري)
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="أدخل أي ملاحظات إضافية هنا..."
                          className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/events')}
                  size="sm"
                  disabled={addEventMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-5"
                  size="sm"
                  disabled={addEventMutation.isPending}
                >
                  {addEventMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري الإضافة...
                    </span>
                  ) : (
                    'إضافة المناسبة'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Date Picker Dialog (Simplified with native selects) */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="p-0 sm:max-w-xs" dir="rtl">
          <div className="bg-blue-600 text-white p-3 rounded-t-md">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5" /> {/* Changed icon */}
              <DialogTitle className="text-lg font-semibold text-center">
                اختيار التاريخ الهجري
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-blue-500 h-7 w-7"
                onClick={() => setIsDateDialogOpen(false)}
                aria-label="إغلاق"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <Label
                htmlFor="dialog-hijri-day"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                اليوم
              </Label>
              <select
                id="dialog-hijri-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from(
                  { length: maxDaysInSelectedMonth },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={`picker-day-${d}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label
                htmlFor="dialog-hijri-month"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                الشهر
              </Label>
              <select
                id="dialog-hijri-month"
                value={selectedMonth} // 1-indexed
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={`picker-month-${m}`} value={m}>
                    {getHijriMonthName(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label
                htmlFor="dialog-hijri-year"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                السنة
              </Label>
              <select
                id="dialog-hijri-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from(
                  { length: 21 },
                  (_, i) => const_CURRENT_HIJRI_YEAR_PLACEHOLDER - 10 + i
                ).map(
                  (y) =>
                    y >= 1400 &&
                    y <= 1500 && (
                      <option key={`picker-year-${y}`} value={y}>
                        {y}
                      </option>
                    )
                )}
              </select>
            </div>
          </div>
          <div className="py-3 px-4 flex justify-end border-t bg-gray-50 rounded-b-md space-x-2 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDateDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleDateDialogConfirm}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Added a simple Label component if not available globally or from shadcn
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label {...props} />
);
