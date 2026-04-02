import { create } from "zustand";
import type { Schedule } from "../types/schedule";
import { loadSchedules, saveSchedules } from "../utils/storage";

type ScheduleInput = Omit<Schedule, "id"> & { id?: string };

function persist(schedules: Schedule[]): void {
  saveSchedules(schedules);
}

export const useScheduleStore = create<{
  schedules: Schedule[];
  addSchedule: (input: ScheduleInput) => void;
  updateSchedule: (schedule: Schedule) => void;
  removeSchedule: (id: string) => void;
}>()((set, get) => ({
  schedules: loadSchedules(),

  addSchedule: (input) => {
    const id = input.id ?? crypto.randomUUID();
    const schedule: Schedule = {
      id,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      priority: input.priority,
    };
    const next = [...get().schedules, schedule];
    set({ schedules: next });
    persist(next);
  },

  updateSchedule: (schedule) => {
    const next = get().schedules.map((s) =>
      s.id === schedule.id ? schedule : s,
    );
    set({ schedules: next });
    persist(next);
  },

  removeSchedule: (id) => {
    const next = get().schedules.filter((s) => s.id !== id);
    set({ schedules: next });
    persist(next);
  },
}));
