"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const http_1 = require("http");
const storage_1 = require("./storage");
const auth_1 = require("./auth");
const auth_2 = require("./auth");
const ummAlQuraCalendar_1 = require("./ummAlQuraCalendar");
const adminRoutes_1 = require("./adminRoutes");
const gregorianMonthLengths = {
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
const generateCalendarMonth = (year, month, isHijri) => {
    const daysInMonth = isHijri
        ? ummAlQuraCalendar_1.hijriMonthLengths[month] || 30
        : gregorianMonthLengths[month] || 30;
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
        let hijriDate, gregorianDate, weekDay;
        if (isHijri) {
            hijriDate = { day, month, year };
            gregorianDate = (0, ummAlQuraCalendar_1.estimateGregorianFromHijri)(day, month, year);
            weekDay = gregorianDate.weekDay;
        }
        else {
            weekDay = new Date(year, month - 1, day).getDay();
            gregorianDate = { day, month, year, weekDay };
            hijriDate = (0, ummAlQuraCalendar_1.estimateHijriFromGregorian)(day, month, year);
        }
        dates.push({
            hijriDay: hijriDate.day,
            hijriMonth: hijriDate.month,
            hijriYear: hijriDate.year,
            gregorianDay: gregorianDate.day,
            gregorianMonth: gregorianDate.month,
            gregorianYear: gregorianDate.year,
            hijriMonthName: (0, ummAlQuraCalendar_1.getHijriMonthName)(hijriDate.month),
            gregorianMonthName: (0, ummAlQuraCalendar_1.getGregorianMonthName)(gregorianDate.month),
            weekDay,
            weekDayName: (0, ummAlQuraCalendar_1.getArabicDayName)(weekDay),
        });
    }
    return {
        hijriYear: isHijri ? year : dates[0].hijriYear,
        hijriMonth: isHijri ? month : dates[0].hijriMonth,
        gregorianYear: isHijri ? dates[0].gregorianYear : year,
        gregorianMonth: isHijri ? dates[0].gregorianMonth : month,
        dates,
        hijriMonthName: (0, ummAlQuraCalendar_1.getHijriMonthName)(isHijri ? month : dates[0].hijriMonth),
        gregorianMonthName: (0, ummAlQuraCalendar_1.getGregorianMonthName)(isHijri ? dates[0].gregorianMonth : month),
    };
};
function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, auth_2.setupAuth)(app);
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
            const hijriBirth = (0, ummAlQuraCalendar_1.estimateHijriFromGregorian)(birth.getDate(), birth.getMonth() + 1, birth.getFullYear());
            const hijriNow = (0, ummAlQuraCalendar_1.estimateHijriFromGregorian)(now.getDate(), now.getMonth() + 1, now.getFullYear());
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
                const todayDate = (0, ummAlQuraCalendar_1.getUmmAlQuraToday)();
                res.json(todayDate);
            }
            catch (error) {
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
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                const isHijri = calendar === 'hijri';
                if (isNaN(yearNum) || isNaN(monthNum)) {
                    return res
                        .status(400)
                        .json({ message: 'السنة والشهر يجب أن تكون أرقامًا صحيحة' });
                }
                const calendarMonth = generateCalendarMonth(yearNum, monthNum, isHijri);
                res.json(calendarMonth);
            }
            catch (error) {
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
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                const dayNum = parseInt(day);
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
                    const gregorianDate = (0, ummAlQuraCalendar_1.estimateGregorianFromHijri)(dayNum, monthNum, yearNum);
                    gregorianDay = gregorianDate.day;
                    gregorianMonth = gregorianDate.month;
                    gregorianYear = gregorianDate.year;
                    weekDay = gregorianDate.weekDay;
                }
                else {
                    gregorianDay = dayNum;
                    gregorianMonth = monthNum;
                    gregorianYear = yearNum;
                    weekDay = new Date(yearNum, monthNum - 1, dayNum).getDay();
                    const hijriDate = (0, ummAlQuraCalendar_1.estimateHijriFromGregorian)(dayNum, monthNum, yearNum);
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
                    hijriMonthName: (0, ummAlQuraCalendar_1.getHijriMonthName)(hijriMonth),
                    gregorianMonthName: (0, ummAlQuraCalendar_1.getGregorianMonthName)(gregorianMonth),
                    weekDay,
                    weekDayName: (0, ummAlQuraCalendar_1.getArabicDayName)(weekDay),
                });
            }
            catch (error) {
                console.error('Error converting date:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء تحويل التاريخ' });
            }
        });
        // // --- قائمة التصنيفات ---
        // app.get('/api/categories', (req, res) => {
        //   const categories = [
        //     { id: 'all', name: 'الكل', default: true },
        //     { id: '1', name: 'أعياد', color: 'green' },
        //     { id: '2', name: 'مناسبات شخصية', color: 'purple' },
        //     { id: '3', name: 'مواعيد طبية', color: 'red' },
        //     { id: '4', name: 'أعمال', color: 'orange' },
        //     { id: '5', name: 'سفر', color: 'teal' },
        //   ];
        //   res.json(categories);
        // });
        app.get('/api/categories/:id', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const categoryId = parseInt(req.params.id);
                if (isNaN(categoryId)) {
                    return res.status(400).json({ message: 'معرف التصنيف غير صالح' });
                }
                const category = yield storage_1.storage.getCategoryById(categoryId);
                if (!category || category.userId !== req.user.id) {
                    return res.status(404).json({ message: 'التصنيف غير موجود' });
                }
                res.json(category);
            }
            catch (error) {
                console.error('خطأ في جلب التصنيف:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء جلب التصنيف' });
            }
        }));
        app.get('/api/categories', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield storage_1.storage.getUserCategories(req.user.id);
                res.json(categories);
            }
            catch (error) {
                console.error('خطأ في جلب التصنيفات:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء جلب التصنيفات' });
            }
        }));
        app.post('/api/categories', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, color } = req.body;
                if (!name || !color) {
                    return res.status(400).json({ message: 'الاسم واللون مطلوبان' });
                }
                const newCategory = yield storage_1.storage.createCategory({
                    name,
                    color,
                    userId: req.user.id,
                });
                res.status(201).json(newCategory);
            }
            catch (error) {
                console.error('خطأ في إنشاء التصنيف:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التصنيف' });
            }
        }));
        app.put('/api/categories/:id', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const categoryId = parseInt(req.params.id);
                if (isNaN(categoryId)) {
                    return res.status(400).json({ message: 'معرف التصنيف غير صالح' });
                }
                const updateData = req.body;
                const updatedCategory = yield storage_1.storage.updateCategory(categoryId, updateData);
                res.json(updatedCategory);
            }
            catch (error) {
                console.error('خطأ في تعديل التصنيف:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء تعديل التصنيف' });
            }
        }));
        app.delete('/api/categories/:id', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const categoryId = parseInt(req.params.id);
                if (isNaN(categoryId)) {
                    return res.status(400).json({ message: 'معرف التصنيف غير صالح' });
                }
                yield storage_1.storage.deleteCategory(categoryId);
                res.json({ message: 'تم حذف التصنيف بنجاح' });
            }
            catch (error) {
                console.error('خطأ في حذف التصنيف:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء حذف التصنيف' });
            }
        }));
        // --- بيانات مناسبات افتراضية ---
        // const defaultEvents: Event[] = [
        //   {
        //     id: 1,
        //     title: 'عيد الفطر',
        //     days: 3,
        //     date: {
        //       hijri: { day: 1, month: 10, year: 1444, formatted: '01/10/1444' },
        //       gregorian: { day: 10, month: 4, year: 2023, formatted: '10/04/2023' },
        //     },
        //     color: 'green',
        //     categoryId: '1',
        //   },
        //   {
        //     id: 2,
        //     title: 'عيد الأضحى',
        //     days: 4,
        //     date: {
        //       hijri: { day: 10, month: 12, year: 1444, formatted: '10/12/1444' },
        //       gregorian: { day: 17, month: 6, year: 2023, formatted: '17/06/2023' },
        //     },
        //     color: 'green',
        //     categoryId: '1',
        //   },
        //   // يمكن إضافة مناسبات أخرى هنا
        // ];
        // --- جلب مناسبات المستخدم ---
        // --- جلب مناسبات المستخدم فقط ---
        app.get('/api/events', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const rawEvents = yield storage_1.storage.getUserEvents(req.user.id);
                const today = new Date();
                const formattedUserEvents = rawEvents.map((event) => {
                    const { hijriDay, hijriMonth, hijriYear, gregorianDay, gregorianMonth, gregorianYear, } = event;
                    const eventDate = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
                    const days = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return {
                        id: event.id,
                        title: event.title,
                        notes: event.description,
                        time: event.eventTime,
                        days: event.days,
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
                });
                res.json(formattedUserEvents);
            }
            catch (error) {
                console.error('Error fetching events:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء جلب المناسبات' });
            }
        }));
        app.post('/api/events', auth_1.requireAuth, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { title, days, date, time, notes } = req.body;
                if (!title ||
                    !days ||
                    !(date === null || date === void 0 ? void 0 : date.hijriDay) ||
                    !(date === null || date === void 0 ? void 0 : date.hijriMonth) ||
                    !(date === null || date === void 0 ? void 0 : date.hijriYear) ||
                    !(date === null || date === void 0 ? void 0 : date.gregorianDay) ||
                    !(date === null || date === void 0 ? void 0 : date.gregorianMonth) ||
                    !(date === null || date === void 0 ? void 0 : date.gregorianYear)) {
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
                const event = yield storage_1.storage.createEvent({
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
            }
            catch (error) {
                console.error('خطأ في إنشاء المناسبة:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء إنشاء المناسبة' });
            }
        }));
        // --- حذف مناسبة ---
        app.delete('/api/events/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const eventId = parseInt(req.params.id);
                if (isNaN(eventId)) {
                    return res.status(400).json({ message: 'معرف المناسبة غير صالح' });
                }
                yield storage_1.storage.deleteEvent(eventId);
                res.json({ message: 'تم حذف المناسبة بنجاح' });
            }
            catch (error) {
                console.error('Error deleting event:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء حذف المناسبة' });
            }
        }));
        // --- تعديل مناسبة ---
        app.put('/api/events/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const eventId = parseInt(req.params.id);
                const updateData = req.body;
                if (isNaN(eventId)) {
                    return res.status(400).json({ message: 'معرف المناسبة غير صالح' });
                }
                // تحقق من صحة التاريخ الهجري إذا تم تحديثه
                if (((_a = updateData.date) === null || _a === void 0 ? void 0 : _a.hijri) &&
                    !(0, ummAlQuraCalendar_1.isValidHijriDate)(updateData.date.hijri.day, updateData.date.hijri.month, updateData.date.hijri.year)) {
                    return res.status(400).json({ message: 'تاريخ هجري غير صالح' });
                }
                const updatedEvent = yield storage_1.storage.updateEvent(eventId, updateData);
                res.json(updatedEvent);
            }
            catch (error) {
                console.error('Error updating event:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء تعديل المناسبة' });
            }
        }));
        // --- تسجيل مستخدم جديد ---
        app.post('/api/users/register', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = req.body;
                if (!data.username || !data.password) {
                    return res
                        .status(400)
                        .json({ message: 'يجب توفير اسم المستخدم وكلمة المرور' });
                }
                data.password = yield (0, auth_2.hashPassword)(data.password);
                const user = yield storage_1.storage.users.create(data);
                res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح', user });
            }
            catch (error) {
                console.error('Error registering user:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء تسجيل المستخدم' });
            }
        }));
        // --- تسجيل الدخول ---
        app.post('/api/users/login', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    return res
                        .status(400)
                        .json({ message: 'يجب توفير اسم المستخدم وكلمة المرور' });
                }
                const user = yield storage_1.storage.users.findByUsername(username);
                if (!user) {
                    return res.status(401).json({ message: 'المستخدم غير موجود' });
                }
                const isPasswordValid = yield storage_1.storage.users.verifyPassword(user, password);
                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
                }
                const token = yield storage_1.storage.sessions.create(user.id);
                res.json({ message: 'تم تسجيل الدخول بنجاح', token });
            }
            catch (error) {
                console.error('Error logging in:', error);
                res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
            }
        }));
        // --- إعداد مسارات الادمن المحمية ---
        (0, adminRoutes_1.setupAdminRoutes)(app);
        // --- بدء السيرفر ---
        return (0, http_1.createServer)(app);
    });
}
