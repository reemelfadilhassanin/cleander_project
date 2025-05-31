import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import HijriDate from 'hijri-date/lib/safe';

import {
  ArrowRight,
  Calendar,
  Edit2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
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
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const eventSchema = z.object({
  title: z.string().min(2, 'العنوان يجب أن يكون على الأقل حرفين'),
  category: z.string().min(1, 'الرجاء اختيار الفئة'),
  date: z.object({
    hijriMonth: z.number().min(1).max(12),
    hijriYear: z.number().min(1400).max(1500),
    hijriDay: z.number().min(1).max(30),
  }),
  days: z.number().min(1).max(365),
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

export default function AddEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHijri, setIsHijri] = useState(true);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const dayParam = searchParams.get('day');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  // احصل على التاريخ الهجري الحالي بدقة
  const todayHijri = new HijriDate();
  const CURRENT_HIJRI_YEAR = todayHijri.getFullYear();
  const CURRENT_HIJRI_MONTH = todayHijri.getMonth() + 1;
  const CURRENT_HIJRI_DAY = todayHijri.getDate();

  const initialDay = dayParam ? parseInt(dayParam, 10) : CURRENT_HIJRI_DAY;
  const initialMonth = monthParam ? parseInt(monthParam, 10) : CURRENT_HIJRI_MONTH;
  const initialYear = yearParam ? parseInt(yearParam, 10) : CURRENT_HIJRI_YEAR;

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [maxDaysInSelectedMonth, setMaxDaysInSelectedMonth] = useState(30);

  const [categories, setCategories] = useState<
    { id: string; name: string; color: string; default?: boolean }[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب الفئات من السيرفر
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(
          'https://cleander-project-server.onrender.com/api/categories',
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error('فشل في جلب الفئات');
        const data = await res.json();
        setCategories(data);
        setCategoriesLoaded(true);
      } catch (error) {
        console.error('خطأ أثناء جلب الفئات:', error);
      }
    }
    fetchCategories();
  }, []);

  // ضبط max أيام الشهر بناء على الشهر والسنة الهجرية المختارة
  useEffect(() => {
    try {
      const hijriCal = new HijriDate(selectedYear, selectedMonth - 1, 1);
      const days = hijriCal.daysInMonth();
      setMaxDaysInSelectedMonth(days);
      if (selectedDay > days) setSelectedDay(days);
    } catch {
      setMaxDaysInSelectedMonth(30);
    }
  }, [selectedMonth, selectedYear, selectedDay]);

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
      try {
        const hijriCalendar = new HijriDate(year, month - 1, 1);
        setMaxDaysInSelectedMonth(hijriCalendar.daysInMonth());
      } catch {
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
      try {
        const hijriCalendar = new HijriDate(formDate.hijriYear, formDate.hijriMonth - 1, 1);
        setMaxDaysInSelectedMonth(hijriCalendar.daysInMonth());
      } catch {
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

    try {
      const hijriCal = new HijriDate(hijriYear, hijriMonth - 1, 1);
      const maxDays = hijriCal.daysInMonth();
      if (hijriDay > maxDays) {
        form.setError('date.hijriDay', {
          type: 'manual',
          message: `شهر ${getHijriMonthName(hijriMonth)} لا يمكن أن يكون فيه أكثر من ${maxDays} يوم`,
        });
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Fallback ignore
    }

    // تحويل التاريخ الهجري إلى ميلادي
    const hijriDate = new HijriDate(hijriYear, hijriMonth - 1, hijriDay);
    const gregorianDate = hijriDate.toGregorian();

    if (isNaN(gregorianDate.getTime())) {
      toast({
        title: 'خطأ في التاريخ',
        description: 'فشل في تحويل التاريخ الهجري إلى ميلادي. تأكد من صحة اليوم والشهر.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: values.title,
      category: values.category,
      hijriDay,
      hijriMonth,
      hijriYear,
      gregorianDay: gregorianDate.getDate(),
      gregorianMonth: gregorianDate.getMonth() + 1,
      gregorianYear: gregorianDate.getFullYear(),
      days: values.days,
      time: values.time,
      notes: values.notes || '',
      isHijri,
    };

    addEventMutation.mutate(payload);
  };

  const handleDateDialogConfirm = () => {
    form.setValue('date.hijriDay', selectedDay);
    form.setValue('date.hijriMonth', selectedMonth);
    form.setValue('date.hijriYear', selectedYear);
    form.trigger('date');
    setIsDateDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Card>
            <CardHeader>
              <CardTitle>إضافة مناسبة</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان المناسبة</FormLabel>
                    <FormControl>
                      <Input
                        dir="auto"
                        placeholder="أدخل عنوان المناسبة"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>الفئة</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}
                      disabled={isSubmitting || !categoriesLoaded}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <span className="font-semibold">نوع التقويم:</span>
                <div className="flex gap-4">
                  <Button
                    variant={isHijri ? 'default' : 'outline'}
                    onClick={() => setIsHijri(true)}
                    disabled={isSubmitting}
                  >
                    هجري
                  </Button>
                  <Button
                    variant={!isHijri ? 'default' : 'outline'}
                    onClick={() => setIsHijri(false)}
                    disabled={isSubmitting}
                  >
                    ميلادي
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="date"
                render={() => (
                  <FormItem>
                    <FormLabel>تاريخ المناسبة</FormLabel>
                    <div
                      className="flex items-center justify-between border border-gray-300 rounded-md p-2.5 cursor-pointer hover:border-blue-400 text-sm"
                      onClick={() => setIsDateDialogOpen(true)}
                    >
                      <span>
                        {isHijri
                          ? `${form.getValues().date.hijriDay} ${getHijriMonthName(
                              form.getValues().date.hijriMonth
                            )} ${form.getValues().date.hijriYear} هـ`
                          : new HijriDate(
                              form.getValues().date.hijriYear,
                              form.getValues().date.hijriMonth - 1,
                              form.getValues().date.hijriDay
                            )
                              .toGregorian()
                              .toLocaleDateString('ar-SA-u-nu-latn', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }) + ' م'}
                      </span>
                      <Calendar className="h-4 w-4 text-gray-500" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد الأيام</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت المناسبة</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Input
                        dir="auto"
                        placeholder="ملاحظات إضافية"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="self-end"
            disabled={isSubmitting}
            aria-label="إضافة المناسبة"
          >
            {isSubmitting ? 'جار الإضافة...' : 'إضافة المناسبة'}
          </Button>
        </form>
      </Form>

      {/* حوار اختيار التاريخ */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>اختر التاريخ الهجري</DialogTitle>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label htmlFor="hijriYear" className="block mb-1 font-semibold">
                السنة الهجرية
              </label>
              <select
                id="hijriYear"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({ length: 150 }, (_, i) => 1400 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hijriMonth" className="block mb-1 font-semibold">
                الشهر الهجري
              </label>
              <select
                id="hijriMonth"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {getHijriMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hijriDay" className="block mb-1 font-semibold">
                اليوم
              </label>
              <select
                id="hijriDay"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({ length: maxDaysInSelectedMonth }, (_, i) => i + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleDateDialogConfirm}>تأكيد</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

