"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { localDate, Range, today } from "@/lib/api";

export function Calendar({
  start,
  end,
  onChange,
  blocked = [],
}: {
  start: string;
  end: string;
  onChange: (s: string, e: string) => void;
  blocked?: Range[];
}) {
  const [month, setMonth] = useState(() => {
    const date = start ? new Date(start + "T12:00:00") : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [notice, setNotice] = useState("");
  const busy = (s: string) =>
    blocked.some((b) => s >= b.check_in && s < b.check_out);
  const selectingEnd = Boolean(start && !end);
  const select = (s: string) => {
    setNotice("");
    if (selectingEnd && s > start) {
      if (blocked.some((b) => start < b.check_out && s > b.check_in)) {
        setNotice(
          "This range includes booked nights. Choose an earlier check-out.",
        );
        return;
      }
      onChange(start, s);
    } else if (!busy(s)) {
      onChange(s, "");
    }
  };
  const renderMonth = (offset: number) => {
    const first = new Date(month.getFullYear(), month.getMonth() + offset, 1),
      count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return (
      <div className={"month month-" + offset}>
        <h3>
          {first.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="calendar-grid">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span className="weekday" key={"w" + i}>
              {d}
            </span>
          ))}
          {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => (
            <span key={"e" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const value = localDate(
              new Date(first.getFullYear(), first.getMonth(), i + 1),
            );
            const booked = busy(value);
            const boundary =
              selectingEnd &&
              value > start &&
              !blocked.some((b) => start < b.check_out && value > b.check_in);
            const disabled = value < today() || (booked && !boundary);
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                aria-label={`${value}${booked && !boundary ? " unavailable" : ""}`}
                aria-pressed={value === start || value === end}
                className={
                  (value === start || value === end ? "chosen " : "") +
                  (start && end && value > start && value < end
                    ? "in-range"
                    : "")
                }
                onClick={() => select(value)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const isCurrent =
    month <= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          type="button"
          className="icon-button"
          disabled={isCurrent}
          aria-label="Previous month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={19} />
        </button>
        <span>{selectingEnd ? "Select check-out" : "Select check-in"}</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <div className="months">
        {renderMonth(0)}
        {renderMonth(1)}
      </div>
      {notice && (
        <p className="form-error" role="alert">
          {notice}
        </p>
      )}
      <button
        className="text-button"
        type="button"
        onClick={() => {
          onChange("", "");
          setNotice("");
        }}
      >
        Clear dates
      </button>
    </div>
  );
}

export function GuestCounter({
  value,
  onChange,
  max = 30,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="guest-counter">
      <div>
        <strong>Guests</strong>
        <p className="muted">
          {max < 30 ? `Up to ${max} guests` : "How many are coming?"}
        </p>
      </div>
      <div>
        <button
          type="button"
          className="circle-button"
          aria-label="Fewer guests"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={16} />
        </button>
        <span>{value}</span>
        <button
          type="button"
          className="circle-button"
          aria-label="More guests"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
