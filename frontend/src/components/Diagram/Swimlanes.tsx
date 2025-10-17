/**
 * Swimlanes Component
 * Renders vertical swimlanes for medallion layers in the diagram
 */

import { MEDALLION_COLORS } from '../../types/canvas';
import type { MedallionLayer } from '../../types/canvas';

interface SwimlanesProps {
  className?: string;
}

export function Swimlanes({ className = '' }: SwimlanesProps) {
  const SWIMLANE_WIDTH = 400;
  const layers: MedallionLayer[] = ['Source', 'Raw', 'Bronze', 'Silver', 'Gold'];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg className="w-full h-full">
        {layers.map((layer, index) => {
          const x = index * SWIMLANE_WIDTH;
          const color = MEDALLION_COLORS[layer];

          return (
            <g key={layer}>
              {/* Vertical divider line */}
              {index > 0 && (
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2="100%"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.5"
                />
              )}

              {/* Layer label at the top */}
              <g transform={`translate(${x + SWIMLANE_WIDTH / 2}, 30)`}>
                <rect
                  x="-60"
                  y="-12"
                  width="120"
                  height="24"
                  fill={color}
                  rx="4"
                  opacity="0.9"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="600"
                >
                  {layer}
                </text>
              </g>

              {/* Optional: subtle background for the lane */}
              <rect
                x={x}
                y={0}
                width={SWIMLANE_WIDTH}
                height="100%"
                fill={color}
                opacity="0.02"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
