import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { requireAuth } from './auth';
import { setupAuth, isAdmin, hashPassword } from './auth';
import { InsertUser } from '@shared/schema';
import {
  getHijriMonthName,
  getGregorianMonthName,
  getArabicDayName,
  getUmmAlQuraToday,
  estimateGregorianFromHijri,
  estimateHijriFromGregorian,
  hijriMonthLengths,
  isValidHijriDate,
} from './ummAlQuraCalendar';
import { setupAdminRoutes } from './adminRoutes';

interface UmmAlQuraDate {
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  hijriMonthName: string;
  gregorianMonthName: string;
  weekDay: number;
  weekDayName: string;
}

interface UmmAlQuraMonth {
  hijriYear: number;
  hijriMonth: number;
  gregorianYear: number;
  gregorianMonth: number;
  dates: UmmAlQuraDate[];
  hijriMonthName: string;
  gregorianMonthName: string;
}

const gregorianMonthLengths: Record<number, number> = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

// توليد بيانات شهر كامل حسب التقويم الهجري أو الميلادي
const generateCalendarMonth = (
  year: number,
  month: number,
  isHijri: boolean
): UmmAlQuraMonth => {
  const daysInMonth = isHijri
    ? hijriMonthLengths[month] || 30
    : gregorianMonthLengths[month] || 30;

  const dates: UmmAlQuraDate[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    let hijriDate, gregorianDate, weekDay;

    if (isHijri) {
      hijriDate = { day, month, year };
      gregorianDate = estimateGregorianFromHijri(day, month, year);
      weekDay = gregorianDate.weekDay;
    } else {
      weekDay = new Date(year, month - 1, day).getDay();
      gregorianDate = { day, month, year, weekDay };
      hijriDate = estimateHijriFromGregorian(day, month, year);
    }

    dates.push({
      hijriDay: hijriDate.day,
      hijriMonth: hijriDate.month,
      hijriYear: hijriDate.year,
      gregorianDay: gregorianDate.day,
      gregorianMonth: gregorianDate.month,
      gregorianYear: gregorianDate.year,
      hijriMonthName: getHijriMonthName(hijriDate.month),
      gregorianMonthName: getGregorianMonthName(gregorianDate.month),
      weekDay,
      weekDayName: getArabicDayName(weekDay),
    });
  }

  return {
    hijriYear: isHijri ? year : dates[0].hijriYear,
    hijriMonth: isHijri ? month : dates[0].hijriMonth,
    gregorianYear: isHijri ? dates[0].gregorianYear : year,
    gregorianMonth: isHijri ? dates[0].gregorianMonth : month,
    dates,
    hijriMonthName: getHijriMonthName(isHijri ? month : dates[0].hijriMonth),
    gregorianMonthName: getGregorianMonthName(
      isHijri ? dates[0].gregorianMonth : month
    ),
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get('/api/age-calculator', (req, res) => {
    const { birthDate } = req.query;

    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ message: 'يرجى توفير تاريخ الميلاد' });
    }

    const birth = new Date(birthDate);
    const now = new Date();

    if (isNaN(birth.getTime())) {
      return res.status(400).json({ message: 'تاريخ الميلاد غير صالح' });
    }

    // حساب العمر بالتقويم الميلادي
    let gYears = now.getFullYear() - birth.getFullYear();
    let gMonths = now.getMonth() - birth.getMonth();
    let gDays = now.getDate() - birth.getDate();

    if (gDays < 0) {
      gMonths -= 1;
      gDays += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (gMonths < 0) {
      gYears -= 1;
      gMonths += 12;
    }

    // تحويل الميلاد والتاريخ الحالي إلى هجري (تقريبي باستخدام وظائف موجودة عندك)
    const hijriBirth = estimateHijriFromGregorian(
      birth.getDate(),
      birth.getMonth() + 1,
      birth.getFullYear()
    );

    const hijriNow = estimateHijriFromGregorian(
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear()
    );

    let hYears = hijriNow.year - hijriBirth.year;
    let hMonths = hijriNow.month - hijriBirth.month;
    let hDays = hijriNow.day - hijriBirth.day;

    if (hDays < 0) {
      hMonths -= 1;
      hDays += 30; // تقدير تقريبي لأيام الشهر الهجري
    }
    if (hMonths < 0) {
      hYears -= 1;
      hMonths += 12;
    }

    res.json({
      gregorianYears: gYears,
      gregorianMonths: gMonths,
      gregorianDays: gDays,
      hijriYears: hYears,
      hijriMonths: hMonths,
      hijriDays: hDays,
    });
  });

  // --- تقويم اليوم الحالي ---
  app.get('/api/calendar/today', (req, res) => {
    try {
      const todayDate = getUmmAlQuraToday();
      res.json(todayDate);
    } catch (error) {
      console.error("Error getting today's date:", error);
      res.status(500).json({ message: 'حدث خطأ أثناء جلب تاريخ اليوم' });
    }
  });

  // --- بيانات شهر تقويمي ---
  app.get('/api/calendar/month', (req, res) => {
    try {
      const { year, month, calendar } = req.query;
      if (!year || !month || !calendar) {
        return res
          .status(400)
          .json({ message: 'يجب توفير السنة والشهر ونوع التقويم' });
      }
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      const isHijri = calendar === 'hijri';

      if (isNaN(yearNum) || isNaN(monthNum)) {
        return res
          .status(400)
          .json({ message: 'السنة والشهر يجب أن تكون أرقامًا صحيحة' });
      }

      const calendarMonth = generateCalendarMonth(yearNum, monthNum, isHijri);
      res.json(calendarMonth);
    } catch (error) {
      console.error('Error getting calendar month:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الشهر' });
    }
  });

  // --- تحويل تاريخ هجري لميلادي أو العكس ---
  app.get('/api/calendar/convert', (req, res) => {
    try {
      const { year, month, day, from } = req.query;

      if (!year || !month || !day) {
        return res
          .status(400)
          .json({ message: 'يجب توفير السنة والشهر واليوم' });
      }

      const fromCalendar = from || 'gregorian';
      const isFromHijri = fromCalendar === 'hijri';

      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      const dayNum = parseInt(day as string);

      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
        return res
          .status(400)
          .json({ message: 'السنة والشهر واليوم يجب أن تكون أرقامًا صحيحة' });
      }

      let hijriDay, hijriMonth, hijriYear;
      let gregorianDay, gregorianMonth, gregorianYear;
      let weekDay;

      if (isFromHijri) {
        hijriDay = dayNum;
        hijriMonth = monthNum;
        hijriYear = yearNum;
        const gregorianDate = estimateGregorianFromHijri(
          dayNum,
          monthNum,
          yearNum
        );
        gregorianDay = gregorianDate.day;
        gregorianMonth = gregorianDate.month;
        gregorianYear = gregorianDate.year;
        weekDay = gregorianDate.weekDay;
      } else {
        gregorianDay = dayNum;
        gregorianMonth = monthNum;
        gregorianYear = yearNum;
        weekDay = new Date(yearNum, monthNum - 1, dayNum).getDay();
        const hijriDate = estimateHijriFromGregorian(dayNum, monthNum, yearNum);
        hijriDay = hijriDate.day;
        hijriMonth = hijriDate.month;
        hijriYear = hijriDate.year;
      }

      res.json({
        hijriDay,
        hijriMonth,
        hijriYear,
        gregorianDay,
        gregorianMonth,
        gregorianYear,
        hijriMonthName: getHijriMonthName(hijriMonth),
        gregorianMonthName: getGregorianMonthName(gregorianMonth),
        weekDay,
        weekDayName: getArabicDayName(weekDay),
      });
    } catch (error) {
      console.error('Error converting date:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحويل التاريخ' });
    }
  });

  // --- قائمة التصنيفات ---
  app.get('/api/categories', (req, res) => {
    const categories = [
      { id: 'all', name: 'الكل', default: true },
      { id: '1', name: 'أعياد', color: 'green' },
      { id: '2', name: 'مناسبات شخصية', color: 'purple' },
      { id: '3', name: 'مواعيد طبية', color: 'red' },
      { id: '4', name: 'أعمال', color: 'orange' },
      { id: '5', name: 'سفر', color: 'teal' },
    ];
    res.json(categories);
  });

  // --- نموذج بيانات المناسبة ---
  interface Event {
    id: number;
    title: string;
    days: number;
    date: {
      hijri: { day: number; month: number; year: number; formatted: string };
      gregorian: {
        day: number;
        month: number;
        year: number;
        formatted: string;
      };
    };
    color: string;
    categoryId: string;
  }

  // --- بيانات مناسبات افتراضية ---
  const defaultEvents: Event[] = [
    {
      id: 1,
      title: 'عيد الفطر',
      days: 3,
      date: {
        hijri: { day: 1, month: 10, year: 1444, formatted: '01/10/1444' },
        gregorian: { day: 10, month: 4, year: 2023, formatted: '10/04/2023' },
      },
      color: 'green',
      categoryId: '1',
    },
    {
      id: 2,
      title: 'عيد الأضحى',
      days: 4,
      date: {
        hijri: { day: 10, month: 12, year: 1444, formatted: '10/12/1444' },
        gregorian: { day: 17, month: 6, year: 2023, formatted: '17/06/2023' },
      },
      color: 'green',
      categoryId: '1',
    },
    // يمكن إضافة مناسبات أخرى هنا
  ];

  // --- جلب مناسبات المستخدم ---
 app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const rawEvents = await storage.getUserEvents(req.user.id);
    const today = new Date();

    const formatted = rawEvents
      .map((event) => {
        const { hijriDay, hijriMonth, hijriYear, gregorianDay, gregorianMonth, gregorianYear } = event;

        const eventDate = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
        const days = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: event.id,
          title: event.title,
          notes: event.description,
          time: event.eventTime,
          days,
          category: event.categoryId || 'uncategorized',
          date: {
            hijri: {
              day: hijriDay,
              month: hijriMonth,
              year: hijriYear,
              formatted: `${String(hijriDay).padStart(2, '0')}/${String(hijriMonth).padStart(2, '0')}/${hijriYear}`,
            },
            gregorian: {
              day: gregorianDay,
              month: gregorianMonth,
              year: gregorianYear,
              formatted: `${String(gregorianDay).padStart(2, '0')}/${String(gregorianMonth).padStart(2, '0')}/${gregorianYear}`,
            },
          },
        };
      })
      .filter(event => event.days >= 0); // ✅ فلترة المناسبات التي لم تنتهِ بعد

    // --- فلترة المناسبات الافتراضية بنفس الطريقة ---
    const filteredDefaultEvents = defaultEvents
      .map((event) => {
        const eventDate = new Date(
          event.date.gregorian.year,
          event.date.gregorian.month - 1,
          event.date.gregorian.day
        );
        const days = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return { ...event, days };
      })
      .filter(event => event.days >= 0); // ✅ فقط المستقبلية أو اليوم

    res.json([...formatted, ...filteredDefaultEvents]);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المناسبات' });
  }
});


  app.post('/api/events', requireAuth, async (req, res) => {
    try {
      const { title, days, date, time, notes } = req.body;

      if (
        !title ||
        !days ||
        !date?.hijriDay ||
        !date?.hijriMonth ||
        !date?.hijriYear ||
        !date?.gregorianDay ||
        !date?.gregorianMonth ||
        !date?.gregorianYear
      ) {
        return res
          .status(400)
          .json({ message: 'بيانات غير مكتملة لإنشاء المناسبة' });
      }
      console.log('📥 Data passed to createEvent:', {
        title,
        days,
        userId: req.user.id,
        hijriDay: date.hijriDay,
        hijriMonth: date.hijriMonth,
        hijriYear: date.hijriYear,
        gregorianDay: date.gregorianDay,
        gregorianMonth: date.gregorianMonth,
        gregorianYear: date.gregorianYear,
        eventTime: time,
        isHijri: date.isHijri,
        description: notes,
      });

      const event = await storage.createEvent({
        title,
        days,
        userId: req.user.id,

        hijriDay: date.hijriDay,
        hijriMonth: date.hijriMonth,
        hijriYear: date.hijriYear,

        gregorianDay: date.gregorianDay,
        gregorianMonth: date.gregorianMonth,
        gregorianYear: date.gregorianYear,

        eventTime: time,
        isHijri: date.isHijri,
        description: notes,
      });

      res.status(201).json(event);
    } catch (error) {
      console.error('خطأ في إنشاء المناسبة:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء إنشاء المناسبة' });
    }
  });

  // --- حذف مناسبة ---
  app.delete('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'معرف المناسبة غير صالح' });
      }
      await storage.deleteEvent(eventId);

      res.json({ message: 'تم حذف المناسبة بنجاح' });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء حذف المناسبة' });
    }
  });

  // --- تعديل مناسبة ---
  app.put('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updateData = req.body as Partial<Event>;
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'معرف المناسبة غير صالح' });
      }

      // تحقق من صحة التاريخ الهجري إذا تم تحديثه
      if (
        updateData.date?.hijri &&
        !isValidHijriDate(
          updateData.date.hijri.day,
          updateData.date.hijri.month,
          updateData.date.hijri.year
        )
      ) {
        return res.status(400).json({ message: 'تاريخ هجري غير صالح' });
      }

      const updatedEvent = await storage.updateEvent(eventId, updateData);

      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تعديل المناسبة' });
    }
  });

  // --- تسجيل مستخدم جديد ---
  app.post('/api/users/register', async (req, res) => {
    try {
      const data = req.body as InsertUser;
      if (!data.username || !data.password) {
        return res
          .status(400)
          .json({ message: 'يجب توفير اسم المستخدم وكلمة المرور' });
      }
      data.password = await hashPassword(data.password);
      const user = await storage.users.create(data);
      res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح', user });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تسجيل المستخدم' });
    }
  });

  // --- تسجيل الدخول ---
  app.post('/api/users/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: 'يجب توفير اسم المستخدم وكلمة المرور' });
      }
      const user = await storage.users.findByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'المستخدم غير موجود' });
      }
      const isPasswordValid = await storage.users.verifyPassword(
        user,
        password
      );
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
      }
      const token = await storage.sessions.create(user.id);
      res.json({ message: 'تم تسجيل الدخول بنجاح', token });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
    }
  });

  // --- إعداد مسارات الادمن المحمية ---
  setupAdminRoutes(app);

  // --- بدء السيرفر ---
  return createServer(app);
}
