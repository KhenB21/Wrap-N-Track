import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Lightweight calendar picker with no native dependency — works in Expo Go
// without a rebuild. Dates before `minDate` (defaults to today) are disabled.
export default function DatePickerModal({ visible, onClose, onSelect, selectedDate, minDate, darkMode = false }) {
  const today = toDateOnly(minDate ? new Date(minDate) : new Date());
  const initialMonth = selectedDate ? toDateOnly(new Date(selectedDate)) : today;

  const [viewMonth, setViewMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  useEffect(() => {
    if (visible) {
      const base = selectedDate ? toDateOnly(new Date(selectedDate)) : today;
      setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const colors = {
    bg: darkMode ? "#232323" : "#fff",
    text: darkMode ? "#F5F5F7" : "#111",
    secondaryText: darkMode ? "#B0B0B0" : "#6B6593",
    border: darkMode ? "#393A3B" : "#E0E0E0",
    accent: darkMode ? "#6B6593" : "#6B6593",
    disabled: darkMode ? "#555" : "#ccc",
    selectedBg: "#6B6593",
    overlay: "rgba(0,0,0,0.5)",
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isPastMonth = () => {
    const firstOfThisViewMonth = new Date(year, month, 1);
    const firstOfMinMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstOfThisViewMonth <= firstOfMinMonth;
  };

  const goPrevMonth = () => {
    if (isPastMonth()) return;
    setViewMonth(new Date(year, month - 1, 1));
  };
  const goNextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const selected = selectedDate ? toDateOnly(new Date(selectedDate)) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.bg }]} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goPrevMonth}
              disabled={isPastMonth()}
              style={styles.navButton}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={isPastMonth() ? colors.disabled : colors.text}
              />
            </TouchableOpacity>
            <Text style={[styles.headerText, { color: colors.text }]}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.navButton}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={[styles.weekdayText, { color: colors.secondaryText }]}>
                {wd}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, idx) => {
              if (!date) return <View key={`empty-${idx}`} style={styles.cell} />;
              const isPast = date < today;
              const isSelected = selected && date.getTime() === selected.getTime();
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    styles.cell,
                    isSelected && { backgroundColor: colors.selectedBg, borderRadius: 20 },
                  ]}
                  disabled={isPast}
                  onPress={() => {
                    onSelect(toISODate(date));
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: isPast ? colors.disabled : isSelected ? "#fff" : colors.text },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navButton: {
    padding: 6,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
