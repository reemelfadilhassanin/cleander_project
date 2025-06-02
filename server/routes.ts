import express from 'express';
import cors from 'cors';
import Hijri from 'hijri-js';

const app = express();

app.use(cors());
app.use(express.json());

// أسماء الشهور الهجرية
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

// أسماء الشهور الميلادية
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

// أسماء أيام الأسبوع بالعربية
const arabicDayNames = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

// دوال الحصول على الأسماء
function getHijriMonthName(month: number) {
  return hijriMonthNames[month - 1] || '';
}

function getGregorianMonthName(month: number) {
  return gregorianMonthNames[month - 1] || '';
}

function getArabicDayName(day: number) {
  return arabicDayNames[day] || '';
}

// دوال التحويل باستخدام hijri-js

function convertGregorianToHijri(day: number, month: number, year: number) {
  const date = new Date(year, month - 1, day);
  const hijri = Hijri.gregorianToHijri(date);
  return {
    day: hijri.hijriDay,
    month: hijri.hijriMonth,
    year: hijri.hijriYear,
  };
}

function convertHijriToGregorian(day: number, month: number, year: number) {
  const gregorian = Hijri.hijriToGregorian(year, month, day);
  return {
    day: gregorian.gregorianDay,
    month: gregorian.gregorianMonth,
    year: gregorian.gregorianYear,
  };
}

// دالة لتوليد تقويم شهري (ميلادي أو هجري)

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
  hijriMonthName: string;
  gregorianMonthName: string;
  dates: UmmAlQuraDate[];
}

const gregorianMonthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const hijriMonthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

function isGregorianLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInGregorianMonth(year: number, month: number) {
  if (month === 2) {
    return isGregorianLeapYear(year) ? 29 : 28;
  }
  return gregorianMonthLengths[month - 1];
}

function getDaysInHijriMonth(year: number, month: number) {
  // الهجري تقريبا 29 أو 30 يوم، هذا تقريب حسب ترتيب الشهور
  // في hijri-js لا يوجد دالة مباشرة لمعرفة عدد أيام الشهر الهجري
  // يمكننا حسابه بتوليد أول يوم من الشهر التالي وطرح يوم واحد
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const startCurrent = Hijri.hijriToGregorian(year, month, 1);
  const startNext = Hijri.hijriToGregorian(nextYear, nextMonth, 1);

  const dateCurrent = new Date(
    startCurrent.gregorianYear,
    startCurrent.gregorianMonth - 1,
    startCurrent.gregorianDay
  );
  const dateNext = new Date(
    startNext.gregorianYear,
    startNext.gregorianMonth - 1,
    startNext.gregorianDay
  );

  const diff =
    (dateNext.getTime() - dateCurrent.getTime()) / (1000 * 60 * 60 * 24);

  return diff;
}

function generateCalendarMonth(
  year: number,
  month: number,
  isHijri: boolean
): UmmAlQuraMonth {
  let daysInMonth: number;

  if (isHijri) {
    daysInMonth = getDaysInHijriMonth(year, month);
  } else {
    daysInMonth = getDaysInGregorianMonth(year, month);
  }

  const dates: UmmAlQuraDate[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    let hijriDate, gregorianDate, weekDay;

    if (isHijri) {
      hijriDate = { day, month, year };
      const gDate = convertHijriToGregorian(day, month, year);
      gregorianDate = { ...gDate };
      weekDay = new Date(gDate.year, gDate.month - 1, gDate.day).getDay();
    } else {
      weekDay = new Date(year, month - 1, day).getDay();
      gregorianDate = { day, month, year };
      hijriDate = convertGregorianToHijri(day, month, year);
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
}

// مسارات API

app.get('/api/calendar/month', (req, res) => {
  try {
    const { year, month, calendar } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: 'يجب توفير السنة والشهر' });
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res
        .status(400)
        .json({ message: 'السنة والشهر يجب أن تكون أرقامًا صحيحة' });
    }

    const isHijri = (calendar as string)?.toLowerCase() === 'hijri';

    const result = generateCalendarMonth(yearNum, monthNum, isHijri);
    res.json(result);
  } catch (error) {
    console.error('Error generating calendar month:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء توليد التقويم' });
  }
});

app.get('/api/calendar/convert', (req, res) => {
  try {
    const { year, month, day, from } = req.query;

    if (!year || !month || !day) {
      return res.status(400).json({ message: 'يجب توفير السنة والشهر واليوم' });
    }

    const fromCalendar = (from as string) || 'gregorian';
    const isFromHijri = fromCalendar.toLowerCase() === 'hijri';

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
      const gDate = convertHijriToGregorian(dayNum, monthNum, yearNum);
      gregorianDay = gDate.day;
      gregorianMonth = gDate.month;
      gregorianYear = gDate.year;
      weekDay = new Date(
        gregorianYear,
        gregorianMonth - 1,
        gregorianDay
      ).getDay();
    } else {
      gregorianDay = dayNum;
      gregorianMonth = monthNum;
      gregorianYear = yearNum;
      weekDay = new Date(
        gregorianYear,
        gregorianMonth - 1,
        gregorianDay
      ).getDay();
      const hDate = convertGregorianToHijri(dayNum, monthNum, yearNum);
      hijriDay = hDate.day;
      hijriMonth = hDate.month;
      hijriYear = hDate.year;
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

app.get('/api/age-calculator', (req, res) => {
  try {
    const { birthDate } = req.query;
    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ message: 'يجب توفير تاريخ الميلاد' });
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return res.status(400).json({ message: 'تاريخ الميلاد غير صالح' });
    }

    const now = new Date();

    // حساب العمر بالميلادي
    let ageYear = now.getFullYear() - birth.getFullYear();
    let ageMonth = now.getMonth() - birth.getMonth();
    let ageDay = now.getDate() - birth.getDate();

    if (ageDay < 0) {
      ageMonth -= 1;
      ageDay += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }

    if (ageMonth < 0) {
      ageYear -= 1;
      ageMonth += 12;
    }

    // حساب العمر بالهجري
    const hijriBirth = convertGregorianToHijri(
      birth.getDate(),
      birth.getMonth() + 1,
      birth.getFullYear()
    );
    const hijriNow = convertGregorianToHijri(
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear()
    );

    let ageHijriYear = hijriNow.year - hijriBirth.year;
    let ageHijriMonth = hijriNow.month - hijriBirth.month;
    let ageHijriDay = hijriNow.day - hijriBirth.day;

    if (ageHijriDay < 0) {
      ageHijriMonth -= 1;
      ageHijriDay += getDaysInHijriMonth(
        hijriNow.year,
        hijriNow.month === 1 ? 12 : hijriNow.month - 1
      );
    }

    if (ageHijriMonth < 0) {
      ageHijriYear -= 1;
      ageHijriMonth += 12;
    }

    res.json({
      ageGregorian: {
        years: ageYear,
        months: ageMonth,
        days: ageDay,
      },
      ageHijri: {
        years: ageHijriYear,
        months: ageHijriMonth,
        days: ageHijriDay,
      },
    });
  } catch (error) {
    console.error('Error calculating age:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حساب العمر' });
  }
});

// بداية السيرفر

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
