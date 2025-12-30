"use client";
import { formatNairaWithSymbolDirect } from "@/lib/utils/currency";

interface CustomPriceRangeProps {
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}

export default function CustomPriceRange({
  min = 300000,
  max = 800000,
  value,
  onChange,
}: CustomPriceRangeProps) {
  // Calculate percentage for the gradient "stop" point
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="custom-slider w-full h-2 rounded-lg appearance-none cursor-pointer bg-transparent"
        style={{
          background: `linear-gradient(to right, #6344F5 0%, #6344F5 ${percentage}%, #F1F5F9 ${percentage}%, #F1F5F9 100%)`,
        }}
      />

      <div className="flex justify-between mt-4 text-gray-400">
        <span className="text-sm font-normal">
          Min: {formatNairaWithSymbolDirect(min)}
        </span>
        <span className="text-sm font-normal">
          Full: {formatNairaWithSymbolDirect(max)}
        </span>
      </div>

      <style jsx>{`
        /* 2. Styling the Thumb (The white circle with purple border) */
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border: 2px solid #6344f5;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -1px; /* Center thumb on the track */
        }

        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #ffffff;
          border: 2px solid #6344f5;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
