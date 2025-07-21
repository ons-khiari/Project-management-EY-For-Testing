"use client";

import type { Deliverable } from "@/app/types/deliverable";
import DeliverableCard from "./deliverable-card";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface DeliverableColumnProps {
  title: string;
  count: number;
  total: number;
  deliverables: Deliverable[];
  id: string; // Column ID for drag and drop
  onDeliverableSelect?: (deliverable: Deliverable) => void;
  onDeliverableDelete?: (deliverableId: string) => void;
}

export default function DeliverableColumn({
  title,
  count,
  total,
  deliverables,
  id,
  onDeliverableSelect,
  onDeliverableDelete,
}: DeliverableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Determine accent color based on status
  const getAccentColor = () => {
    switch (id) {
      case "todo":
        return "border-gray-400";
      case "inProgress":
        return "border-[#27acaa]";
      case "done":
        return "border-[#ffe500]";
      default:
        return "border-gray-400";
    }
  };

  // Determine header background color based on status
  const getHeaderColor = () => {
    switch (id) {
      case "todo":
        return "bg-gray-50";
      case "inProgress":
        return "bg-[#27acaa]/5";
      case "done":
        return "bg-[#ffe500]/5";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`border-t-4 ${getAccentColor()} rounded-t-xl`}>
        <div
          className={`flex items-center justify-between px-4 py-3 ${getHeaderColor()}`}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-800">{title}</h3>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-700">
              {count}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 p-3 transition-colors duration-200 ${
          isOver ? "bg-gray-50" : ""
        } overflow-y-auto min-h-[150px] max-h-[calc(100vh-220px)]`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#E5E7EB transparent",
        }}
      >
        <style jsx global>{`
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background-color: #e5e7eb;
            border-radius: 20px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: #d1d5db;
          }
        `}</style>

        <SortableContext
          items={deliverables.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deliverables.map((deliverable, index) => (
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
              index={index}
              onSelect={onDeliverableSelect}
              onDelete={onDeliverableDelete}
            />
          ))}
        </SortableContext>

        {deliverables.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
            <p className="text-center text-sm text-gray-400">
              Drop deliverables here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
