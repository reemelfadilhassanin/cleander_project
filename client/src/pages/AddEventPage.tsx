import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  Clock as ClockIcon,
  Edit2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useCategories } from '@/context/CategoryContext';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// Import the HijriDate library
import HijriDate from 'hijri-date';

// NOTE: The approximate hijriMonthLengths map is now removed as we use HijriDate library for accuracy.
// The hijriToGregorianApprox function is still a rough estimate; for accuracy, use a robust library or backend conversion.

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

function hijriToGregorianApprox(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number
): Date {
  // This is a very rough approximation. For accurate conversion, a dedicated library is essential.
  // The formula below is simplistic and will have errors.
  // Example: (Year H - 1) * 354.36708 / 365.2425 + 622.57
  // Do NOT rely on this for precise calculations.
  const gregorianYearEstimate = Math.floor(hijriYear * 0.97 + 622);
  // This is highly simplified and doesn't account for month overlaps well.
  return new Date(gregorianYearEstimate, hijriMonth - 1, hijriDay);
}

export default function AddEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHijri, setIsHijri] = useState(true); // Default to Hijri input/display
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);

  const searchString = window.location.search;
  const searchParams = new URLSearchParams(searchString);
  const dayParam = searchParams.get('day');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  // --- Robust Default Date Initialization ---
  // Use HijriDate to get the current Hijri date for a more accurate default
  const todayHijri = new HijriDate();
  const const_CURRENT_HIJRI_YEAR_PLACEHOLDER = todayHijri.getFullYear();
  const const_CURRENT_HIJRI_MONTH_PLACEHOLDER = todayHijri.getMonth() + 1; // getMonth() is 0-indexed
  const const_CURRENT_HIJRI_DAY_PLACEHOLDER = todayHijri.getDate();

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
  const [maxDaysInSelectedMonth, setMaxDaysInSelectedMonth] = useState(30); // Default, will be updated by effect

  const [_, setLocation] = useLocation();
  const { categories } = useCategories();
  const { toast } = useToast();

  const defaultCategory =
    categories.find((cat) => cat.default)?.id ||
    (categories.length > 0 ? categories[0].id : '');

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      category: defaultCategory,
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

  const queryClient = useQueryClient();

  // Effect to update max days when selected month/year in dialog changes
  useEffect(() => {
    try {
      const hijriCalendar = new HijriDate(selectedYear, selectedMonth, 1);
      const days = hijriCalendar.daysInMonth();
      setMaxDaysInSelectedMonth(days);
      // Adjust selectedDay if it exceeds the new max days
      if (selectedDay > days) {
        setSelectedDay(days);
      }
    } catch (error) {
      console.error('Error calculating days in Hijri month:', error);
      setMaxDaysInSelectedMonth(30); // Fallback to 30 days in case of error
    }
  }, [selectedMonth, selectedYear, selectedDay]); // Include selectedDay to re-evaluate adjustment

  useEffect(() => {
    if (dayParam && monthParam && yearParam) {
      const day = parseInt(dayParam, 10);
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      form.setValue('date.hijriDay', day);
      form.setValue('date.hijriMonth', month);
      form.setValue('date.hijriYear', year);
      setSelectedDay(day);
      setSelectedMonth(month);
      setSelectedYear(year);
      // Also update maxDaysInSelectedMonth for initial params
      try {
        const hijriCalendar = new HijriDate(year, month, 1);
        setMaxDaysInSelectedMonth(hijriCalendar.daysInMonth());
      } catch (error) {
        console.error('Error setting initial max days:', error);
        setMaxDaysInSelectedMonth(30);
      }
    }
  }, [dayParam, monthParam, yearParam, form]);

  useEffect(() => {
    if (isDateDialogOpen) {
      const formDate = form.getValues().date;
      setSelectedDay(formDate.hijriDay);
      setSelectedMonth(formDate.hijriMonth);
      setSelectedYear(formDate.hijriYear);
      // Ensure maxDaysInSelectedMonth is correct when dialog opens
      try {
        const hijriCalendar = new HijriDate(
          formDate.hijriYear,
          formDate.hijriMonth,
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

    // Use HijriDate to get accurate max days for validation
    let actualMaxDaysInMonth;
    try {
      const hijriCalendar = new HijriDate(hijriYear, hijriMonth, 1);
      actualMaxDaysInMonth = hijriCalendar.daysInMonth();
    } catch (error) {
      console.error('Error during submission validation:', error);
      actualMaxDaysInMonth = 30; // Fallback
    }

    if (hijriDay > actualMaxDaysInMonth) {
      form.setError('date.hijriDay', {
        type: 'manual',
        message: `شهر ${getHijriMonthName(
          hijriMonth
        )} لا يمكن أن يكون فيه أكثر من ${actualMaxDaysInMonth} يوم`,
      });
      setIsSubmitting(false);
      return;
    }

    let datePayload;
    if (isHijri) {
      // إرسال القيم الهجرية فقط عند isHijri = true
      datePayload = {
        hijriDay: values.date.hijriDay,
        hijriMonth: values.date.hijriMonth,
        hijriYear: values.date.hijriYear,
        isHijri: true,
      };
    } else {
      // تحويل التاريخ الهجري إلى ميلادي قبل الإرسال
      const hijriDate = new HijriDate(
        values.date.hijriYear,
        values.date.hijriMonth,
        values.date.hijriDay
      );
      const gregorianDate = hijriDate.toGregorian();

      datePayload = {
        gregorianDay: gregorianDate.getDate(),
        gregorianMonth: gregorianDate.getMonth(),
        gregorianYear: gregorianDate.getFullYear(),
        isHijri: false,
      };
    }

    const payloadToSend = {
      title: values.title,
      category: values.category,
      date: datePayload,
      days: values.days, // Ensure this field is used or remove if not
      time: values.time,
      notes: values.notes,
    };

    console.log(
      'Payload being sent to API:',
      JSON.stringify(payloadToSend, null, 2)
    );
    addEventMutation.mutate(payloadToSend);
  };

  const handleDateDialogConfirm = () => {
    // This function now updates the main form's state with values from the dialog's state
    // selectedDay, selectedMonth, selectedYear are always Hijri as per current dialog implementation.
    form.setValue('date.hijriDay', selectedDay);
    form.setValue('date.hijriMonth', selectedMonth);
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
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.length === 0 && (
                            <SelectItem value="placeholder-disabled" disabled>
                              لا توجد فئات
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
                  name="date.hijriDay"
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
                        onClick={() => setIsDateDialogOpen(true)}
                      >
                        <span>
                          {isHijri
                            ? `${
                                form.getValues().date.hijriDay
                              } ${getHijriMonthName(
                                form.getValues().date.hijriMonth
                              )} ${form.getValues().date.hijriYear} هـ`
                            : hijriToGregorianApprox(
                                form.getValues().date.hijriYear,
                                form.getValues().date.hijriMonth,
                                form.getValues().date.hijriDay
                              ).toLocaleDateString('ar-SA-u-nu-latn', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }) + ' م'}
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
                    </FormItem>
                  )}
                />

                {/* Date Picker Dialog */}
                <Dialog
                  open={isDateDialogOpen}
                  onOpenChange={setIsDateDialogOpen}
                >
                  <DialogContent className="p-0 sm:max-w-xs" dir="rtl">
                    <DialogTitle className="sr-only">
                      اختيار التاريخ
                    </DialogTitle>
                    <div className="bg-emerald-600 text-white p-3 rounded-t-md">
                      <div className="flex items-center justify-between">
                        <Pencil className="h-5 w-5" />
                        <h2 className="text-lg font-semibold text-center">
                          اختيار التاريخ
                        </h2>
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
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Day Selector */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600">
                          اليوم
                        </label>
                        <select
                          value={selectedDay}
                          onChange={(e) =>
                            setSelectedDay(parseInt(e.target.value, 10))
                          }
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
                      {/* Month Selector */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600">
                          الشهر
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => {
                            const monthValue = parseInt(e.target.value, 10);
                            setSelectedMonth(monthValue);
                            // maxDaysInSelectedMonth is updated via useEffect based on selectedMonth/Year
                          }}
                          className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <option
                                key={`picker-month-${month}`}
                                value={month}
                              >
                                {getHijriMonthName(month)}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      {/* Year Selector */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600">
                          السنة
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) =>
                            setSelectedYear(parseInt(e.target.value, 10))
                          }
                          className="block w-full p-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {(() => {
                            // Generate a range of years around the current Hijri year
                            const baseYear =
                              const_CURRENT_HIJRI_YEAR_PLACEHOLDER;
                            const years = [];
                            for (let i = -5; i <= 10; i++) {
                              const yearValue = baseYear + i;
                              if (yearValue >= 1400 && yearValue <= 1500) {
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
                            return years;
                          })()}
                        </select>
                      </div>
                    </div>
                    <div className="py-3 px-4 flex justify-end border-t bg-gray-50 rounded-b-md">
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
                    </div>
                  </DialogContent>
                </Dialog>

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
                          className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                        <Edit2 className="h-4 w-4 text-blue-600" />
                        ملاحظات إضافية (اختياري)
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
              </div>

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
    </div>
  );
}
