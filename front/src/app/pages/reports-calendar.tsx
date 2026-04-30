import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from "date-fns";
import { CalendarDay } from "./reports-types";
import { motion } from "motion/react";
import { useTranslation } from "../../context/LanguageContext";
import { uk as ukDateLocale } from "date-fns/locale";
import { enUS } from "date-fns/locale";

interface ReportsCalendarProps {
    reports: Record<string, any>;
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    month: Date;
    onMonthChange: (month: Date) => void;
    isLoading: boolean;
}

export function ReportsCalendar({ reports, selectedDate, onSelectDate, month, onMonthChange, isLoading }: ReportsCalendarProps) {
    const { language } = useTranslation();
    const locale = language === "uk" ? ukDateLocale : enUS;
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const currentMonth = startOfMonth(month);

    const calendarDays: CalendarDay[] = [];

    const startDay = currentMonth.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
        const date = new Date(month.getFullYear(), month.getMonth() - 1, startDay - i);
        calendarDays.push({
            date,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            isCurrentMonth: false,
            hasReport: false,
        });
    }

    for (const day of daysInMonth) {
        const dateStr = format(day, "yyyy-MM-dd");
        calendarDays.push({
            date: day,
            day: day.getDate(),
            month: day.getMonth(),
            year: day.getFullYear(),
            isCurrentMonth: true,
            hasReport: !!reports[dateStr],
        });
    }

    const endDay = endOfMonth(currentMonth).getDay();
    for (let i = 1; i < 7 - endDay; i++) {
        const date = new Date(month.getFullYear(), month.getMonth() + 1, i);
        calendarDays.push({
            date,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            isCurrentMonth: false,
            hasReport: false,
        });
    }

    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

    return (
        <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                    ←
                </button>
                <h3 className="text-lg font-semibold text-card-foreground capitalize">
                    {format(currentMonth, "LLLL yyyy", { locale })}
                </h3>
                <button
                    onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                    →
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, index) => (
                        <div
                            key={index}
                            className="relative p-3 rounded-md bg-muted/30 animate-pulse"
                        />
                    ))}
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-7 gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {weekDays.map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                            {day}
                        </div>
                    ))}

                    {calendarDays.map((day, index) => {
                        const dateStr = format(day.date, "yyyy-MM-dd");
                        const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr;
                        const isTodayDate = isToday(day.date);

                        return (
                            <motion.button
                                key={index}
                                onClick={() => day.hasReport && onSelectDate(day.date)}
                                disabled={!day.hasReport}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.02, duration: 0.15 }}
                                className={`
                                    relative p-3 rounded-md text-sm transition-all
                                    ${!day.isCurrentMonth && "text-muted-foreground/50"}
                                    ${day.hasReport
                                        ? isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer"
                                        : "text-muted-foreground/50 cursor-not-allowed"
                                    }
                                    ${isTodayDate && day.isCurrentMonth && !day.hasReport ? "ring-1 ring-primary" : ""}
                                `}
                            >
                                <span>{day.day}</span>
                                {day.hasReport && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
}