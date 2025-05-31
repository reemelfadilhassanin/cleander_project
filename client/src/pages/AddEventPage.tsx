import { useState, useEffect } from 'react';
import { useLocation } from 'wouter'; // Removed Link as it's not used
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import HijriDate from 'hijri-date/lib/safe';
import {
  ArrowRight,
  Calendar,
  Clock as ClockIcon, // Keep ClockIcon as it's used
  Edit2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useCategories } from '@/context/CategoryContext'; // Kept as it was in your provided code
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog'; // Keep Dialog parts

const eventSchema = z.object({
  title: z.string().min(2, 'العنوان يجب أن يكون على الأقل حرفين'),
  category: z.string().min(1, 'الرجاء اختيار الفئة'),
  date: z.object({
    hijriMonth: z.number().min(1).max(12),
    hijriYear: z.number().min(1300).max(1600), // Adjusted range
    hijriDay: z.number().min(1).max(30),
  }),
  days: z.number().min(1).max(365),
  time: z.string().min(1, 'الرجاء اختيار الوقت'),
  notes: z.string().optional(),
});

const todayGlobalHijri = new HijriDate(); // Use a different name to avoid conflict inside component
const const_CURRENT_HIJRI_YEAR_PLACEHOLDER = todayGlobalHijri.getFullYear();
const const_CURRENT_HIJRI_MONTH_PLACEHOLDER = todayGlobalHijri.getMonth() + 1;
const const_CURRENT_HIJRI_DAY_PLACEHOLDER = todayGlobalHijri.getDate();

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
  const [isHijri, setIsHijri] = useState(true); // State to toggle Hijri/Gregorian display
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false); // For the original Hijri picker dialog

  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- States for the original Hijri Date Picker Dialog ---
  const searchString = window.location.search;
  const searchParams = new URLSearchParams(searchString);
  const dayParam = searchParams.get('day');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

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
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [maxDaysInSelectedMonth, setMaxDaysInSelectedMonth] = useState(30);

  const [categories, setCategories] = useState<
    { id: string; name: string; color: string; default?: boolean }[]
  >([]);
  // const [categoriesLoaded, setCategoriesLoaded] = useState(false); // This state was in your original code but not directly used for logic.

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      category: '',
      date: {
        hijriDay: initialDay,
        hijriMonth: initialMonth,
        hijriYear: initialYear,
      },
      days: 1,
      time: '12:00',
      notes: '',
    },
  });

  useEffect(() => {
    if (categories.length > 0) {
      const currentCategoryValue = form.getValues('category');
      if (!currentCategoryValue) {
        const defCat =
          categories.find((cat) => cat.default)?.id || categories[0].id;
        if (defCat) form.setValue('category', defCat);
      }
    }
  }, [categories, form]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          'https://cleander-project-server.onrender.com/api/categories',
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error('فشل في جلب الفئات من الخادم');
        const data = await res.json();
        setCategories(data);
        // setCategoriesLoaded(true);
      } catch (error: any) {
        console.error('خطأ أثناء جلب الفئات:', error);
        toast({
          title: 'خطأ في جلب الفئات',
          description: error.message,
          variant: 'destructive',
        });
      }
    };
    fetchCategories();
  }, [toast]);

  // Effect to update form values if URL params are present
  useEffect(() => {
    if (dayParam && monthParam && yearParam) {
      const day = parseInt(dayParam, 10);
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);

      form.setValue('date.hijriDay', day);
      form.setValue('date.hijriMonth', month);
      form.setValue('date.hijriYear', year);

      // Also update state for the Hijri picker dialog if it's opened
      setSelectedDay(day);
      setSelectedMonth(month);
      setSelectedYear(year);
    }
  }, [dayParam, monthParam, yearParam, form]);

  // Effect for the original Hijri Date Picker Dialog: update max days in month
  useEffect(() => {
    if (isDateDialogOpen) {
      // Only calculate when dialog is open or relevant states change
      try {
        // Month for HijriDate constructor is 0-indexed
        const hijriCalendar = new HijriDate(selectedYear, selectedMonth - 1, 1);
        const daysInMonth = hijriCalendar.daysInMonth();
        setMaxDaysInSelectedMonth(daysInMonth);
        if (selectedDay > daysInMonth) {
          setSelectedDay(daysInMonth); // Adjust if current day exceeds new max
        }
      } catch (error) {
        console.error(
          'Error calculating days in Hijri month for dialog:',
          error
        );
        setMaxDaysInSelectedMonth(30); // Fallback
      }
    }
  }, [selectedMonth, selectedYear, selectedDay, isDateDialogOpen]); // Added selectedDay and isDateDialogOpen

  // Effect for the original Hijri Date Picker Dialog: sync with form when opened
  useEffect(() => {
    if (isDateDialogOpen) {
      const formDate = form.getValues().date;
      setSelectedDay(formDate.hijriDay);
      setSelectedMonth(formDate.hijriMonth);
      setSelectedYear(formDate.hijriYear);
      // Max days will be set by the other useEffect based on these values
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
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في إضافة المناسبة',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    setIsSubmitting(true);

    if (!values.title.trim()) {
      form.setError('title', {
        type: 'manual',
        message: 'يجب إدخال عنوان للمناسبة',
      });
      setIsSubmitting(false);
      return;
    }

    const { hijriDay, hijriMonth, hijriYear } = values.date;

    let actualMaxDaysInMonth;
    try {
      // Validate against HijriDate library
      const tempHijriDate = new HijriDate(hijriYear, hijriMonth - 1, 1); // Month is 0-indexed for constructor
      actualMaxDaysInMonth = tempHijriDate.daysInMonth();
    } catch (error) {
      console.error('Error during submission validation (daysInMonth):', error);
      form.setError('date.hijriDay', {
        type: 'manual',
        message: 'خطأ في التحقق من صحة تاريخ الشهر الهجري.',
      });
      setIsSubmitting(false);
      return;
    }

    if (hijriDay > actualMaxDaysInMonth) {
      form.setError('date.hijriDay', {
        type: 'manual',
        message: `شهر ${getHijriMonthName(
          hijriMonth
        )} لهذه السنة به ${actualMaxDaysInMonth} يوم فقط.`,
      });
      setIsSubmitting(false);
      return;
    }

    let gregorianDateForPayload: Date;
    try {
      const hijriDateForSubmit = new HijriDate(
        hijriYear,
        hijriMonth - 1,
        hijriDay
      ); // Month is 0-indexed
      gregorianDateForPayload = hijriDateForSubmit.toGregorian();
      if (isNaN(gregorianDateForPayload.getTime()))
        throw new Error('Invalid Gregorian date derived');
    } catch (error) {
      toast({
        title: 'خطأ في التاريخ',
        description:
          'فشل في تحويل التاريخ الهجري إلى ميلادي للإرسال. تأكد من صحة اليوم والشهر والسنة.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const datePayload = {
      hijriDay,
      hijriMonth,
      hijriYear,
      gregorianDay: gregorianDateForPayload.getDate(),
      gregorianMonth: gregorianDateForPayload.getMonth() + 1, // JS Date getMonth is 0-indexed
      gregorianYear: gregorianDateForPayload.getFullYear(),
      // isHijri: isHijri, // You can send the display preference if backend needs it
    };

    const payloadToSend = {
      title: values.title,
      categoryId: values.category,
      date: datePayload,
      days: values.days,
      time: values.time,
      notes: values.notes,
      isHijri: true, // Or send the actual 'isHijri' state if it represents user's primary input type.
      // The current 'isHijri' state is for display toggling.
      // If the form always stores Hijri, then `isHijri: true` for the payload makes sense.
    };

    console.log(
      '📦 Payload being sent to API:',
      JSON.stringify(payloadToSend, null, 2)
    );
    addEventMutation.mutate(payloadToSend);
  };

  const handleDateDialogConfirm = () => {
    form.setValue('date.hijriDay', selectedDay);
    form.setValue('date.hijriMonth', selectedMonth);
    form.setValue('date.hijriYear', selectedYear);
    form.trigger('date');
    setIsDateDialogOpen(false);
  };

  const formDateValues = form.watch('date');

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
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                      <Pencil className="h-4 w-4 text-blue-600" /> العنوان
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

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                      <Edit2 className="h-4 w-4 text-blue-600" /> الفئة
                    </FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      dir="rtl"
                    >
                      <FormControl>
                        <SelectTrigger className="text-right text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.length === 0 && (
                          <SelectItem value="placeholder-disabled" disabled>
                            جاري تحميل الفئات...
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

              {/* Date Field (Original Simpler Version) */}
              <FormField
                control={form.control}
                name="date.hijriDay" // Use one part of the date for react-hook-form to attach errors
                render={() => (
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
                      onClick={() => setIsDateDialogOpen(true)} // Opens the original Hijri picker
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          setIsDateDialogOpen(true);
                      }}
                    >
                      <span>
                        {isHijri
                          ? `${formDateValues.hijriDay} ${getHijriMonthName(
                              formDateValues.hijriMonth
                            )} ${formDateValues.hijriYear} هـ`
                          : (() => {
                              try {
                                // Month for HijriDate constructor is 0-indexed
                                return (
                                  new HijriDate(
                                    formDateValues.hijriYear,
                                    formDateValues.hijriMonth - 1,
                                    formDateValues.hijriDay
                                  )
                                    .toGregorian()
                                    .toLocaleDateString('ar-SA-u-nu-latn', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    }) + ' م'
                                );
                              } catch (e) {
                                return 'تاريخ غير صالح للتحويل'; // Fallback for invalid date
                              }
                            })()}
                      </span>
                      <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
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
                    {(form.formState.errors.date as any)?.root?.message && (
                      <FormMessage>
                        {(form.formState.errors.date as any)?.root?.message}
                      </FormMessage>
                    )}
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                      <ClockIcon className="h-4 w-4 text-blue-600" /> الوقت
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                      <Edit2 className="h-4 w-4 text-blue-600" /> ملاحظات إضافية
                      (اختياري)
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="أدخل أي ملاحظات إضافية هنا..."
                        className="flex h-24 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/events')}
                  size="sm"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-5"
                  size="sm"
                  disabled={isSubmitting || addEventMutation.isPending}
                >
                  {isSubmitting || addEventMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      {' '}
                      <RefreshCw className="h-4 w-4 animate-spin" /> جاري
                      الإضافة...{' '}
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

      {/* Original Hijri Date Picker Dialog */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="p-0 sm:max-w-xs" dir="rtl">
          <DialogHeader className="bg-emerald-600 text-white p-3 rounded-t-md">
            {' '}
            {/* Added DialogHeader for styling */}
            <div className="flex items-center justify-between">
              <Pencil className="h-5 w-5" />
              <DialogTitle className="text-lg font-semibold text-center text-white">
                اختيار التاريخ الهجري
              </DialogTitle>{' '}
              {/* Ensure DialogTitle is here */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-emerald-500 h-7 w-7"
                onClick={() => setIsDateDialogOpen(false)}
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
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <Label
                htmlFor="picker-day"
                className="block text-xs font-medium text-gray-600"
              >
                اليوم
              </Label>
              <select
                id="picker-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Array.from(
                  { length: maxDaysInSelectedMonth },
                  (_, i) => i + 1
                ).map((day) => (
                  <option key={`picker-day-${day}`} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="picker-month"
                className="block text-xs font-medium text-gray-600"
              >
                الشهر
              </Label>
              <select
                id="picker-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={`picker-month-${month}`} value={month}>
                    {getHijriMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="picker-year"
                className="block text-xs font-medium text-gray-600"
              >
                السنة
              </Label>
              <select /* Consider changing to input type number for wider year range or direct input */
                id="picker-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                {(() => {
                  const baseYear = const_CURRENT_HIJRI_YEAR_PLACEHOLDER;
                  const years = [];
                  for (let i = -10; i <= 10; i++) {
                    // Expanded year range slightly
                    const yearValue = baseYear + i;
                    if (yearValue >= 1350 && yearValue <= 1550) {
                      // Wider valid range
                      years.push(
                        <option
                          key={`picker-year-${yearValue}`}
                          value={yearValue}
                        >
                          {yearValue}
                        </option>
                      );
                    }
                  }
                  // Ensure selectedYear is in the list, if not, add it (edge case if params are outside range)
                  if (
                    !years.find((y) => y.props.value === selectedYear) &&
                    selectedYear >= 1350 &&
                    selectedYear <= 1550
                  ) {
                    years.push(
                      <option
                        key={`picker-year-${selectedYear}`}
                        value={selectedYear}
                      >
                        {selectedYear}
                      </option>
                    );
                    years.sort((a, b) => a.props.value - b.props.value); // Keep sorted
                  }
                  return years;
                })()}
              </select>
            </div>
          </div>
          <DialogFooter className="py-3 px-4 flex justify-end border-t bg-gray-50 rounded-b-md">
            {' '}
            {/* Added DialogFooter */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => setIsDateDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleDateDialogConfirm}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
