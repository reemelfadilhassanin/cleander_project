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
  // Clock as ClockIcon, // ClockIcon seems unused in the form
  Edit2,
  Pencil,
  RefreshCw,
} from 'lucide-react';

// Assuming these are available from your project structure
// Ensure CalendarDate is defined appropriately in your project
// e.g. in @/lib/api.ts or a types file
// export interface CalendarDate {
//   hijriDay?: number;
//   hijriMonthName?: string;
//   hijriMonthNumeric?: number;
//   hijriYear?: number;
//   gregorianDay?: number;
//   gregorianMonthName?: string;
//   gregorianMonthNumeric?: number;
//   gregorianYear?: number;
//   weekDayName?: string;
// }
import { convertDate, CalendarDate } from '@/lib/api';
import { toArabicNumerals } from '@/lib/dateUtils';

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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
// import { useCategories } from '@/context/CategoryContext'; // This was in your original code but not used. Removed for now.

const eventSchema = z.object({
  title: z.string().min(2, 'العنوان يجب أن يكون على الأقل حرفين'),
  category: z.string().min(1, 'الرجاء اختيار الفئة'),
  date: z.object({
    hijriMonth: z.number().min(1).max(12),
    hijriYear: z.number().min(1300).max(1600), // Adjusted range
    hijriDay: z.number().min(1).max(30), // Max day validation is dynamic in dialog and onSubmit
  }),
  days: z.number().min(1).max(365),
  time: z.string().min(1, 'الرجاء اختيار الوقت'),
  notes: z.string().optional(),
});

const todayInitialHijri = new HijriDate(); // For default dates
const const_CURRENT_HIJRI_YEAR_PLACEHOLDER = todayInitialHijri.getFullYear();
const const_CURRENT_HIJRI_MONTH_PLACEHOLDER = todayInitialHijri.getMonth() + 1; // HijriDate month is 0-indexed for getMonth()
const const_CURRENT_HIJRI_DAY_PLACEHOLDER = todayInitialHijri.getDate();

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

function getGregorianMonthName(month: number): string {
  const gregorianMonthNames = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return gregorianMonthNames[month - 1] || `شهر ${month}`;
}

// Removed unused hijriToGregorianApprox function

export default function AddEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [isHijri, setIsHijri] = useState(true); // Replaced by converter dialog logic
  // const [isDateDialogOpen, setIsDateDialogOpen] = useState(false); // Replaced by isConverterDialogOpen

  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isConverterDialogOpen, setIsConverterDialogOpen] = useState(false);
  const [activeConversionTab, setActiveConversionTab] = useState<
    'hijri-to-gregorian' | 'gregorian-to-hijri'
  >('hijri-to-gregorian');

  const [hijriDateForConverter, setHijriDateForConverter] = useState({
    day: const_CURRENT_HIJRI_DAY_PLACEHOLDER,
    month: const_CURRENT_HIJRI_MONTH_PLACEHOLDER,
    year: const_CURRENT_HIJRI_YEAR_PLACEHOLDER,
  });
  const [gregorianDateForConverter, setGregorianDateForConverter] = useState(
    () => {
      const gDate = todayInitialHijri.toGregorian();
      return {
        day: gDate.getDate(),
        month: gDate.getMonth() + 1, // JS Date getMonth is 0-indexed
        year: gDate.getFullYear(),
      };
    }
  );
  const [convertedApiDate, setConvertedApiDate] = useState<CalendarDate | null>(
    null
  );
  const [maxDaysInConverterHijriMonth, setMaxDaysInConverterHijriMonth] =
    useState(30);
  const [
    maxDaysInConverterGregorianMonth,
    setMaxDaysInConverterGregorianMonth,
  ] = useState(31);

  const [categories, setCategories] = useState<
    { id: string; name: string; color: string; default?: boolean }[]
  >([]);
  // const [categoriesLoaded, setCategoriesLoaded] = useState(false); // This state was in your original code but not directly used for logic.

  const searchString = window.location.search;
  const searchParams = new URLSearchParams(searchString);
  const dayParam = searchParams.get('day');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const initialHijriDay = dayParam
    ? parseInt(dayParam, 10)
    : const_CURRENT_HIJRI_DAY_PLACEHOLDER;
  const initialHijriMonth = monthParam
    ? parseInt(monthParam, 10)
    : const_CURRENT_HIJRI_MONTH_PLACEHOLDER;
  const initialHijriYear = yearParam
    ? parseInt(yearParam, 10)
    : const_CURRENT_HIJRI_YEAR_PLACEHOLDER;

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      category: '', // Default category will be set after categories are fetched
      date: {
        hijriDay: initialHijriDay,
        hijriMonth: initialHijriMonth,
        hijriYear: initialHijriYear,
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
        form.setValue('category', defCat);
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
            credentials: 'include', // Important for cookies if your API uses them
          }
        );
        if (!res.ok) throw new Error('فشل في جلب الفئات من الخادم');
        const data = await res.json();
        setCategories(data);
        // setCategoriesLoaded(true); // Not directly used
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

  useEffect(() => {
    if (dayParam && monthParam && yearParam) {
      const day = parseInt(dayParam, 10);
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);

      form.setValue('date.hijriDay', day);
      form.setValue('date.hijriMonth', month);
      form.setValue('date.hijriYear', year);

      setHijriDateForConverter({ day, month, year });
      try {
        const gDate = new HijriDate(year, month - 1, day).toGregorian();
        const initialGregorian = {
          day: gDate.getDate(),
          month: gDate.getMonth() + 1,
          year: gDate.getFullYear(),
        };
        setGregorianDateForConverter(initialGregorian);
        setConvertedApiDate({
          hijriDay: day,
          hijriMonthNumeric: month,
          hijriYear: year,
          gregorianDay: initialGregorian.day,
          gregorianMonthNumeric: initialGregorian.month,
          gregorianYear: initialGregorian.year,
          // You can attempt to get month names here if needed for initial display
          hijriMonthName: getHijriMonthName(month),
          gregorianMonthName: getGregorianMonthName(initialGregorian.month),
          // weekDayName can also be derived if needed
        });
      } catch (e) {
        console.error(
          'Error converting initial params to Gregorian for converter states',
          e
        );
        // Fallback if HijriDate conversion fails for some reason
        const todayG = new Date();
        setGregorianDateForConverter({
          day: todayG.getDate(),
          month: todayG.getMonth() + 1,
          year: todayG.getFullYear(),
        });
        setConvertedApiDate(null); // Ensure no stale data
      }
    } else {
      // If no params, ensure convertedApiDate is initialized from form's default hijri
      const formDate = form.getValues().date;
      try {
        const gDate = new HijriDate(
          formDate.hijriYear,
          formDate.hijriMonth - 1,
          formDate.hijriDay
        ).toGregorian();
        setConvertedApiDate({
          hijriDay: formDate.hijriDay,
          hijriMonthNumeric: formDate.hijriMonth,
          hijriYear: formDate.hijriYear,
          gregorianDay: gDate.getDate(),
          gregorianMonthNumeric: gDate.getMonth() + 1,
          gregorianYear: gDate.getFullYear(),
          hijriMonthName: getHijriMonthName(formDate.hijriMonth),
          gregorianMonthName: getGregorianMonthName(gDate.getMonth() + 1),
        });
      } catch (e) {
        console.error(
          'Error setting initial convertedApiDate from defaults',
          e
        );
        setConvertedApiDate(null);
      }
    }
  }, [dayParam, monthParam, yearParam, form]); // form added as dependency

  // Removed useEffect for isDateDialogOpen as it's replaced
  // Removed useEffect for selectedDay, selectedMonth, selectedYear as that logic is now in converter dialog

  const convertDateMutation = useMutation<
    CalendarDate,
    Error,
    { date: { year: number; month: number; day: number; isHijri: boolean } }
  >({
    mutationFn: async (params) => {
      return await convertDate(params.date);
    },
    onSuccess: (data) => {
      toast({ title: 'تم التحويل', description: 'تم تحويل التاريخ بنجاح.' });
      setConvertedApiDate(data);
      if (data.hijriYear && data.hijriMonthNumeric && data.hijriDay) {
        setHijriDateForConverter({
          year: data.hijriYear,
          month: data.hijriMonthNumeric,
          day: data.hijriDay,
        });
      }
      if (
        data.gregorianYear &&
        data.gregorianMonthNumeric &&
        data.gregorianDay
      ) {
        setGregorianDateForConverter({
          year: data.gregorianYear,
          month: data.gregorianMonthNumeric,
          day: data.gregorianDay,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'خطأ في التحويل',
        description: error.message || 'فشل في تحويل التاريخ عبر الـ API.',
        variant: 'destructive',
      });
      setConvertedApiDate(null);
    },
  });

  const handleTriggerConversion = () => {
    if (activeConversionTab === 'hijri-to-gregorian') {
      // Validate Hijri input before sending to API
      try {
        new HijriDate(
          hijriDateForConverter.year,
          hijriDateForConverter.month - 1,
          hijriDateForConverter.day
        );
        convertDateMutation.mutate({
          date: { ...hijriDateForConverter, isHijri: true },
        });
      } catch (e) {
        toast({
          title: 'تاريخ هجري غير صالح',
          description: 'الرجاء التأكد من اليوم والشهر والسنة.',
          variant: 'destructive',
        });
      }
    } else {
      // Validate Gregorian input
      if (
        gregorianDateForConverter.day > 0 &&
        gregorianDateForConverter.day <= 31 &&
        gregorianDateForConverter.month > 0 &&
        gregorianDateForConverter.month <= 12 &&
        gregorianDateForConverter.year > 1000 &&
        gregorianDateForConverter.year < 3000
      ) {
        // Basic validation
        convertDateMutation.mutate({
          date: { ...gregorianDateForConverter, isHijri: false },
        });
      } else {
        toast({
          title: 'تاريخ ميلادي غير صالح',
          description: 'الرجاء التأكد من اليوم والشهر والسنة.',
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    try {
      const hijriReferenceDate = new HijriDate(
        hijriDateForConverter.year,
        hijriDateForConverter.month - 1,
        1
      );
      const days = hijriReferenceDate.daysInMonth();
      setMaxDaysInConverterHijriMonth(days);
      if (hijriDateForConverter.day > days) {
        setHijriDateForConverter((prev) => ({ ...prev, day: days }));
      }
    } catch (error) {
      console.error(
        'Error calculating days in Hijri month for converter:',
        error
      );
      setMaxDaysInConverterHijriMonth(30);
    }
  }, [hijriDateForConverter.month, hijriDateForConverter.year]);

  useEffect(() => {
    try {
      const days = new Date(
        gregorianDateForConverter.year,
        gregorianDateForConverter.month,
        0
      ).getDate();
      setMaxDaysInConverterGregorianMonth(days);
      if (gregorianDateForConverter.day > days) {
        setGregorianDateForConverter((prev) => ({ ...prev, day: days }));
      }
    } catch (error) {
      console.error(
        'Error calculating days in Gregorian month for converter:',
        error
      );
      setMaxDaysInConverterGregorianMonth(31);
    }
  }, [gregorianDateForConverter.month, gregorianDateForConverter.year]);

  const handleOpenConverterDialog = () => {
    const formDate = form.getValues().date;
    setHijriDateForConverter({
      day: formDate.hijriDay,
      month: formDate.hijriMonth,
      year: formDate.hijriYear,
    });
    try {
      const gDate = new HijriDate(
        formDate.hijriYear,
        formDate.hijriMonth - 1,
        formDate.hijriDay
      ).toGregorian();
      setGregorianDateForConverter({
        day: gDate.getDate(),
        month: gDate.getMonth() + 1,
        year: gDate.getFullYear(),
      });

      if (
        convertedApiDate &&
        convertedApiDate.hijriDay === formDate.hijriDay &&
        convertedApiDate.hijriMonthNumeric === formDate.hijriMonth &&
        convertedApiDate.hijriYear === formDate.hijriYear
      ) {
        // Keep existing convertedApiDate if it matches the form
      } else {
        // If no matching convertedApiDate, generate one from current form values for initial dialog consistency
        setConvertedApiDate({
          hijriDay: formDate.hijriDay,
          hijriMonthNumeric: formDate.hijriMonth,
          hijriYear: formDate.hijriYear,
          hijriMonthName: getHijriMonthName(formDate.hijriMonth),
          gregorianDay: gDate.getDate(),
          gregorianMonthNumeric: gDate.getMonth() + 1,
          gregorianYear: gDate.getFullYear(),
          gregorianMonthName: getGregorianMonthName(gDate.getMonth() + 1),
          // weekDayName could be derived: new Date(gDate).toLocaleDateString('ar-SA', { weekday: 'long' })
        });
      }
    } catch (e) {
      console.error('Error setting initial Gregorian for converter dialog', e);
      const todayG = new Date();
      setGregorianDateForConverter({
        day: todayG.getDate(),
        month: todayG.getMonth() + 1,
        year: todayG.getFullYear(),
      });
      // Set convertedApiDate based on form's Hijri if G conversion fails for dialog init
      setConvertedApiDate({
        hijriDay: formDate.hijriDay,
        hijriMonthNumeric: formDate.hijriMonth,
        hijriYear: formDate.hijriYear,
        hijriMonthName: getHijriMonthName(formDate.hijriMonth),
      });
    }
    setActiveConversionTab('hijri-to-gregorian');
    setIsConverterDialogOpen(true);
  };

  const handleConfirmConverterDialog = () => {
    let dateToConfirm: CalendarDate | null = null;

    if (
      convertedApiDate &&
      convertedApiDate.hijriYear &&
      convertedApiDate.hijriMonthNumeric &&
      convertedApiDate.hijriDay
    ) {
      // Prefer API converted date if available and complete for Hijri
      dateToConfirm = convertedApiDate;
    } else if (activeConversionTab === 'hijri-to-gregorian') {
      // If Hijri tab was active, and no API result, use the Hijri input from dialog
      // And try to get its Gregorian equivalent for display
      try {
        const gEquiv = new HijriDate(
          hijriDateForConverter.year,
          hijriDateForConverter.month - 1,
          hijriDateForConverter.day
        ).toGregorian();
        dateToConfirm = {
          hijriDay: hijriDateForConverter.day,
          hijriMonthNumeric: hijriDateForConverter.month,
          hijriYear: hijriDateForConverter.year,
          hijriMonthName: getHijriMonthName(hijriDateForConverter.month),
          gregorianDay: gEquiv.getDate(),
          gregorianMonthNumeric: gEquiv.getMonth() + 1,
          gregorianYear: gEquiv.getFullYear(),
          gregorianMonthName: getGregorianMonthName(gEquiv.getMonth() + 1),
        };
      } catch (e) {
        toast({
          title: 'تاريخ هجري غير صالح',
          description: 'لا يمكن تأكيد التاريخ الهجري المدخل.',
          variant: 'destructive',
        });
        return;
      }
    } else if (activeConversionTab === 'gregorian-to-hijri') {
      // If Gregorian tab was active, we expect an API conversion to have happened.
      // If not, it implies user typed Gregorian but didn't hit "Convert".
      // For simplicity, we require "Convert" to have been pressed if G input.
      // Or, we could attempt conversion here:
      // This path is less likely if convertedApiDate is the main source.
      toast({
        title: 'تأكيد غير ممكن',
        description:
          "يرجى الضغط على زر 'تحويل' أولاً إذا أدخلت تاريخاً ميلادياً.",
        variant: 'warning',
      });
      return;
    }

    if (
      dateToConfirm &&
      dateToConfirm.hijriDay &&
      dateToConfirm.hijriMonthNumeric &&
      dateToConfirm.hijriYear
    ) {
      form.setValue('date.hijriDay', dateToConfirm.hijriDay);
      form.setValue('date.hijriMonth', dateToConfirm.hijriMonthNumeric);
      form.setValue('date.hijriYear', dateToConfirm.hijriYear);
      setConvertedApiDate(dateToConfirm); // Update the main display state
      form.trigger('date');
      setIsConverterDialogOpen(false);
    } else {
      toast({
        title: 'خطأ',
        description:
          'لا يمكن تأكيد التاريخ. يرجى المحاولة مرة أخرى أو التأكد من صحة البيانات.',
        variant: 'destructive',
      });
    }
  };

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
      // Validate against HijriDate library which is robust for month days
      actualMaxDaysInMonth = new HijriDate(
        hijriYear,
        hijriMonth - 1,
        hijriDay
      ).daysInMonth();
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

    let gregorianPayloadDay, gregorianPayloadMonth, gregorianPayloadYear;
    if (
      convertedApiDate &&
      convertedApiDate.hijriDay === hijriDay &&
      convertedApiDate.hijriMonthNumeric === hijriMonth &&
      convertedApiDate.hijriYear === hijriYear &&
      convertedApiDate.gregorianDay &&
      convertedApiDate.gregorianMonthNumeric &&
      convertedApiDate.gregorianYear
    ) {
      gregorianPayloadDay = convertedApiDate.gregorianDay;
      gregorianPayloadMonth = convertedApiDate.gregorianMonthNumeric;
      gregorianPayloadYear = convertedApiDate.gregorianYear;
    } else {
      try {
        const hijriDateForSubmit = new HijriDate(
          hijriYear,
          hijriMonth - 1,
          hijriDay
        );
        const gregorianDateForSubmit = hijriDateForSubmit.toGregorian();
        if (isNaN(gregorianDateForSubmit.getTime()))
          throw new Error('Invalid Gregorian date derived');
        gregorianPayloadDay = gregorianDateForSubmit.getDate();
        gregorianPayloadMonth = gregorianDateForSubmit.getMonth() + 1;
        gregorianPayloadYear = gregorianDateForSubmit.getFullYear();
      } catch (error) {
        toast({
          title: 'خطأ في التاريخ',
          description:
            'فشل في تحويل التاريخ الهجري إلى ميلادي للارسال. تأكد من صحة اليوم والشهر والسنة.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }

    const datePayload = {
      hijriDay,
      hijriMonth,
      hijriYear,
      gregorianDay: gregorianPayloadDay,
      gregorianMonth: gregorianPayloadMonth,
      gregorianYear: gregorianPayloadYear,
    };

    const payloadToSend = {
      title: values.title,
      categoryId: values.category,
      date: datePayload,
      days: values.days, // This field was in schema but not UI
      time: values.time,
      notes: values.notes,
      isHijri: true,
    };

    console.log(
      '📦 Payload being sent to API:',
      JSON.stringify(payloadToSend, null, 2)
    );
    addEventMutation.mutate(payloadToSend);
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
                        <Calendar className="h-4 w-4 text-blue-600" /> التاريخ
                      </FormLabel>
                      {/* Removed the old toggle button, date type is handled in dialog */}
                    </div>
                    <div
                      className="flex items-center justify-between border border-gray-300 rounded-md p-2.5 cursor-pointer hover:border-blue-400 text-sm"
                      onClick={handleOpenConverterDialog}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          handleOpenConverterDialog();
                      }} // Added spacebar key
                    >
                      <span className="truncate">
                        {' '}
                        {/* Added truncate for long date strings */}
                        {convertedApiDate?.hijriDay &&
                        convertedApiDate?.hijriMonthNumeric &&
                        convertedApiDate?.hijriYear ? (
                          <>
                            {`${toArabicNumerals(convertedApiDate.hijriDay)} ${
                              convertedApiDate.hijriMonthName ||
                              getHijriMonthName(
                                convertedApiDate.hijriMonthNumeric
                              )
                            } ${toArabicNumerals(
                              convertedApiDate.hijriYear
                            )} هـ`}
                            {convertedApiDate.gregorianDay &&
                              convertedApiDate.gregorianMonthNumeric &&
                              convertedApiDate.gregorianYear && (
                                <>
                                  {`  /  `}
                                  {`${toArabicNumerals(
                                    convertedApiDate.gregorianDay
                                  )} ${
                                    convertedApiDate.gregorianMonthName ||
                                    getGregorianMonthName(
                                      convertedApiDate.gregorianMonthNumeric
                                    )
                                  } ${toArabicNumerals(
                                    convertedApiDate.gregorianYear
                                  )} م`}
                                </>
                              )}
                          </>
                        ) : (
                          `${toArabicNumerals(
                            formDateValues.hijriDay
                          )} ${getHijriMonthName(
                            formDateValues.hijriMonth
                          )} ${toArabicNumerals(
                            formDateValues.hijriYear
                          )} هـ (انقر للتعديل)`
                        )}
                      </span>
                      <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />{' '}
                      {/* Added flex-shrink-0 */}
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
              {/* Old Date Picker Dialog - Removed as it's replaced by ConverterDialog */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium mr-1 mb-1 flex items-center gap-1.5 text-gray-700">
                      {/* <ClockIcon className="h-4 w-4 text-blue-600" /> */}{' '}
                      الوقت
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

      <Dialog
        open={isConverterDialogOpen}
        onOpenChange={setIsConverterDialogOpen}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              تحويل و اختيار التاريخ
            </DialogTitle>
          </DialogHeader>
          <Tabs
            value={activeConversionTab}
            onValueChange={(value) => setActiveConversionTab(value as any)}
            className="w-full mt-2"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="hijri-to-gregorian">
                هجري إلى ميلادي
              </TabsTrigger>
              <TabsTrigger value="gregorian-to-hijri">
                ميلادي إلى هجري
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hijri-to-gregorian">
              <div className="space-y-3 p-1">
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label
                      htmlFor="conv-hijri-day"
                      className="text-xs mb-1 block"
                    >
                      اليوم
                    </Label>
                    <select
                      id="conv-hijri-day"
                      value={hijriDateForConverter.day}
                      onChange={(e) =>
                        setHijriDateForConverter((prev) => ({
                          ...prev,
                          day: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from(
                        { length: maxDaysInConverterHijriMonth },
                        (_, i) => i + 1
                      ).map((d) => (
                        <option key={`h-day-${d}`} value={d}>
                          {toArabicNumerals(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="conv-hijri-month"
                      className="text-xs mb-1 block"
                    >
                      الشهر
                    </Label>
                    <select
                      id="conv-hijri-month"
                      value={hijriDateForConverter.month}
                      onChange={(e) =>
                        setHijriDateForConverter((prev) => ({
                          ...prev,
                          month: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={`h-month-${m}`} value={m}>
                          {getHijriMonthName(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="conv-hijri-year"
                      className="text-xs mb-1 block"
                    >
                      السنة
                    </Label>
                    <Input
                      id="conv-hijri-year"
                      type="number"
                      min="1300"
                      max="1600"
                      value={hijriDateForConverter.year}
                      onChange={(e) =>
                        setHijriDateForConverter((prev) => ({
                          ...prev,
                          year:
                            parseInt(e.target.value) ||
                            const_CURRENT_HIJRI_YEAR_PLACEHOLDER,
                        }))
                      }
                      className="text-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {convertedApiDate &&
                  activeConversionTab === 'hijri-to-gregorian' &&
                  convertedApiDate.gregorianDay && (
                    <div className="mt-3 pt-3 border-t text-sm bg-gray-50 p-2 rounded-md">
                      <p className="font-semibold mb-1">
                        التاريخ الميلادي الموافق:
                      </p>
                      <p className="text-blue-600 font-medium">{`${toArabicNumerals(
                        convertedApiDate.gregorianDay
                      )} ${
                        convertedApiDate.gregorianMonthName ||
                        getGregorianMonthName(
                          convertedApiDate.gregorianMonthNumeric!
                        )
                      } ${toArabicNumerals(
                        convertedApiDate.gregorianYear!
                      )} م`}</p>
                    </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="gregorian-to-hijri">
              <div className="space-y-3 p-1">
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label
                      htmlFor="conv-gregorian-day"
                      className="text-xs mb-1 block"
                    >
                      اليوم
                    </Label>
                    <select
                      id="conv-gregorian-day"
                      value={gregorianDateForConverter.day}
                      onChange={(e) =>
                        setGregorianDateForConverter((prev) => ({
                          ...prev,
                          day: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from(
                        { length: maxDaysInConverterGregorianMonth },
                        (_, i) => i + 1
                      ).map((d) => (
                        <option key={`g-day-${d}`} value={d}>
                          {toArabicNumerals(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="conv-gregorian-month"
                      className="text-xs mb-1 block"
                    >
                      الشهر
                    </Label>
                    <select
                      id="conv-gregorian-month"
                      value={gregorianDateForConverter.month}
                      onChange={(e) =>
                        setGregorianDateForConverter((prev) => ({
                          ...prev,
                          month: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={`g-month-${m}`} value={m}>
                          {getGregorianMonthName(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="conv-gregorian-year"
                      className="text-xs mb-1 block"
                    >
                      السنة
                    </Label>
                    <Input
                      id="conv-gregorian-year"
                      type="number"
                      min="1900"
                      max="2100" // Adjusted range for Gregorian
                      value={gregorianDateForConverter.year}
                      onChange={(e) =>
                        setGregorianDateForConverter((prev) => ({
                          ...prev,
                          year:
                            parseInt(e.target.value) ||
                            new Date().getFullYear(),
                        }))
                      }
                      className="text-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {convertedApiDate &&
                  activeConversionTab === 'gregorian-to-hijri' &&
                  convertedApiDate.hijriDay && (
                    <div className="mt-3 pt-3 border-t text-sm bg-gray-50 p-2 rounded-md">
                      <p className="font-semibold mb-1">
                        التاريخ الهجري الموافق:
                      </p>
                      <p className="text-blue-600 font-medium">{`${toArabicNumerals(
                        convertedApiDate.hijriDay
                      )} ${
                        convertedApiDate.hijriMonthName ||
                        getHijriMonthName(convertedApiDate.hijriMonthNumeric!)
                      } ${toArabicNumerals(
                        convertedApiDate.hijriYear!
                      )} هـ`}</p>
                    </div>
                  )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="gap-2 sm:gap-3 pt-4 border-t mt-2">
            {' '}
            {/* Added sm:gap-3 */}
            <Button
              variant="outline"
              onClick={() => setIsConverterDialogOpen(false)}
              className="w-full sm:w-auto order-3 sm:order-1" // Order for mobile
            >
              إلغاء
            </Button>
            <Button
              onClick={handleTriggerConversion}
              disabled={convertDateMutation.isPending}
              className="w-full sm:w-auto order-2 sm:order-2" // Order for mobile
              variant="secondary" // Different variant for convert
            >
              <RefreshCw
                className={`ml-2 h-4 w-4 ${
                  convertDateMutation.isPending ? 'animate-spin' : ''
                }`}
              />
              {convertDateMutation.isPending ? 'جاري التحويل...' : 'تحويل'}
            </Button>
            <Button
              onClick={handleConfirmConverterDialog}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 order-1 sm:order-3" // Order for mobile
            >
              تأكيد و اختيار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
