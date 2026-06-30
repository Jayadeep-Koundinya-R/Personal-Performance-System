import { useState, useMemo } from "react";
import { useHabits } from "@/hooks/use-habits";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CalendarSection = () => {
  const { habits, getTodayStr } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayStr = getTodayStr();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, completions: 0, isToday: false });
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const completions = habits.reduce((count, habit) => {
        return count + (habit.completedDates.includes(dateStr) ? 1 : 0);
      }, 0);
      
      days.push({
        date: dateStr,
        completions,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate, habits, todayStr]);

  const maxCompletions = useMemo(() => {
    return Math.max(...calendarData.map(d => d.completions), 1);
  }, [calendarData]);

  const getCompletionColor = (completions: number) => {
    if (completions === 0) return "bg-surface";
    const ratio = completions / maxCompletions;
    if (ratio >= 0.75) return "bg-green-500";
    if (ratio >= 0.5) return "bg-green-400";
    if (ratio >= 0.25) return "bg-green-300";
    return "bg-green-200";
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Calendar View</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">Visualize your habit completions over time</div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                ${day.isToday ? 'ring-2 ring-primary' : ''}
                ${day.date ? 'hover:scale-105 transition-transform cursor-pointer' : ''}
                ${getCompletionColor(day.completions)}
                ${day.completions > 0 ? 'text-white' : 'text-muted-foreground'}
              `}
              title={day.date ? `${day.date}: ${day.completions} completions` : ''}
            >
              {day.date ? (
                <div className="text-center">
                  <div>{new Date(day.date).getDate()}</div>
                  {day.completions > 0 && (
                    <div className="text-xs opacity-75">{day.completions}</div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-surface rounded" />
            <span>No activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 rounded" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-300 rounded" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Perfect</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {calendarData.filter(d => d.date && d.completions > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Active days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {calendarData.reduce((sum, d) => sum + d.completions, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total completions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round((calendarData.filter(d => d.date && d.completions > 0).length / calendarData.filter(d => d.date).length) * 100) || 0}%
            </div>
            <div className="text-xs text-muted-foreground">Consistency rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSection;
