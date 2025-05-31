"use strict";
// Helper functions for Umm Al-Qura calendar calculations
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceDate = exports.hijriMonthLengths = exports.getArabicDayName = exports.getGregorianMonthName = exports.getHijriMonthName = void 0;
exports.getUmmAlQuraToday = getUmmAlQuraToday;
exports.estimateGregorianFromHijri = estimateGregorianFromHijri;
exports.estimateHijriFromGregorian = estimateHijriFromGregorian;
exports.isValidHijriDate = isValidHijriDate;
// Helper to get Arabic Hijri month names
const getHijriMonthName = (month) => {
    const hijriMonths = [
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
    return hijriMonths[month - 1] || '';
};
exports.getHijriMonthName = getHijriMonthName;
// Helper to get Arabic Gregorian month names
const getGregorianMonthName = (month) => {
    const gregorianMonths = [
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
    return gregorianMonths[month - 1] || '';
};
exports.getGregorianMonthName = getGregorianMonthName;
// Helper to get Arabic day names
const getArabicDayName = (day) => {
    const weekDays = [
        'الأحد',
        'الإثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت',
    ];
    return weekDays[day] || '';
};
exports.getArabicDayName = getArabicDayName;
// Define known Umm Al-Qura dates for 1446 AH to provide accurate conversions
exports.hijriMonthLengths = {
    1: 30, // Muharram
    2: 29, // Safar
    3: 30, // Rabi' al-awwal
    4: 29, // Rabi' al-thani
    5: 30, // Jumada al-awwal
    6: 29, // Jumada al-thani
    7: 30, // Rajab
    8: 29, // Sha'ban
    9: 30, // Ramadan
    10: 29, // Shawwal
    11: 30, // Dhu al-Qi'dah
    12: 29, // Dhu al-Hijjah
};
// Known reference point based on Umm Al-Qura calendar
exports.referenceDate = {
    hijri: { day: 15, month: 11, year: 1446 }, // 15 Dhu al-Qi'dah 1446
    gregorian: { day: 13, month: 5, year: 2025 }, // May 13, 2025
};
// ✅ Updated function to get Umm Al-Qura today's date using the real current date
function getUmmAlQuraToday() {
    const today = new Date();
    const gDay = today.getDate();
    const gMonth = today.getMonth() + 1;
    const gYear = today.getFullYear();
    const weekDay = today.getDay();
    const hijriDate = estimateHijriFromGregorian(gDay, gMonth, gYear);
    return {
        hijriDay: hijriDate.day,
        hijriMonth: hijriDate.month,
        hijriYear: hijriDate.year,
        gregorianDay: gDay,
        gregorianMonth: gMonth,
        gregorianYear: gYear,
        hijriMonthName: (0, exports.getHijriMonthName)(hijriDate.month),
        gregorianMonthName: (0, exports.getGregorianMonthName)(gMonth),
        weekDay: weekDay,
        weekDayName: (0, exports.getArabicDayName)(weekDay),
    };
}
// Function to estimate Gregorian date from Hijri date based on Umm Al-Qura
function estimateGregorianFromHijri(hijriDay, hijriMonth, hijriYear) {
    const monthsDiff = (hijriYear - exports.referenceDate.hijri.year) * 12 +
        (hijriMonth - exports.referenceDate.hijri.month);
    let daysDiff = hijriDay - exports.referenceDate.hijri.day;
    if (monthsDiff > 0) {
        for (let m = exports.referenceDate.hijri.month; m <= 12; m++) {
            if (m !== exports.referenceDate.hijri.month)
                daysDiff += exports.hijriMonthLengths[m] || 30;
        }
        for (let y = exports.referenceDate.hijri.year + 1; y < hijriYear; y++) {
            daysDiff += 354;
        }
        for (let m = 1; m < hijriMonth; m++) {
            daysDiff += exports.hijriMonthLengths[m] || 30;
        }
    }
    else if (monthsDiff < 0) {
        for (let m = exports.referenceDate.hijri.month - 1; m >= 1; m--) {
            daysDiff -= exports.hijriMonthLengths[m] || 30;
        }
        for (let y = exports.referenceDate.hijri.year - 1; y >= hijriYear; y--) {
            daysDiff -= 354;
        }
        for (let m = 12; m >= hijriMonth; m--) {
            daysDiff -= exports.hijriMonthLengths[m] || 30;
        }
    }
    const date = new Date(exports.referenceDate.gregorian.year, exports.referenceDate.gregorian.month - 1, exports.referenceDate.gregorian.day);
    date.setDate(date.getDate() + daysDiff);
    return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        weekDay: date.getDay(),
    };
}
// Function to estimate Hijri date from Gregorian date based on Umm Al-Qura
function estimateHijriFromGregorian(gregorianDay, gregorianMonth, gregorianYear) {
    const gregDate = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
    const refDate = new Date(exports.referenceDate.gregorian.year, exports.referenceDate.gregorian.month - 1, exports.referenceDate.gregorian.day);
    const daysDiff = Math.round((gregDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    let totalDays = exports.referenceDate.hijri.day + daysDiff;
    let year = exports.referenceDate.hijri.year;
    let month = exports.referenceDate.hijri.month;
    while (totalDays > exports.hijriMonthLengths[month]) {
        totalDays -= exports.hijriMonthLengths[month];
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }
    while (totalDays <= 0) {
        month--;
        if (month < 1) {
            month = 12;
            year--;
        }
        totalDays += exports.hijriMonthLengths[month];
    }
    return {
        day: totalDays,
        month,
        year,
        weekDay: gregDate.getDay(),
    };
}
// Function to validate Hijri date
function isValidHijriDate(day, month, year) {
    if (month < 1 || month > 12)
        return false;
    const monthLength = exports.hijriMonthLengths[month] || 30;
    if (day < 1 || day > monthLength)
        return false;
    if (year < 1400 || year > 1500)
        return false;
    return true;
}
