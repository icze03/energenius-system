
"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { type SensorData } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { TimeRange } from "@/app/dashboard/page"
import { format } from "date-fns";

const chartConfig = {
  power: {
    label: "Power (W)",
    color: "hsl(var(--chart-1))",
  },
  voltage: {
    label: "Voltage (V)",
    color: "hsl(var(--chart-2))",
  },
  current: {
    label: "Current (A)",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

interface ConsumptionChartProps {
  data: SensorData[];
  loading: boolean;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

export function ConsumptionChart({ data, loading, timeRange, setTimeRange }: ConsumptionChartProps) {
  
  const timeFormatter = (tick: number | string) => {
    if (typeof tick !== 'number') return String(tick);
    
    const date = new Date(tick);
    switch (timeRange) {
        case '1h':
        case '1d':
            return format(date, "HH:mm");
        case '1w':
            return format(date, "MMM d");
        case '1m':
            return format(date, "MMM d");
        default:
            return format(date, "HH:mm");
    }
  };
  
  const formattedData = data.map(item => ({
    ...item,
    timestamp: item.timestamp.getTime() // Use numeric timestamp for correct sorting/scaling
  }));

  const handleTimeRangeChange = (value: TimeRange | '') => {
    if (value) {
      setTimeRange(value);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Consumption Data</CardTitle>
            <CardDescription>Sensor readings for the selected period</CardDescription>
        </div>
        <ToggleGroup type="single" value={timeRange} onValueChange={handleTimeRangeChange} aria-label="Time range">
          <ToggleGroupItem value="1h" aria-label="1 hour">1H</ToggleGroupItem>
          <ToggleGroupItem value="1d" aria-label="1 day">1D</ToggleGroupItem>
          <ToggleGroupItem value="1w" aria-label="1 week">1W</ToggleGroupItem>
          <ToggleGroupItem value="1m" aria-label="1 month">1M</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
         {loading ? (
             <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">Waiting for data...</p>
            </div>
          ) : data.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart
            accessibilityLayer
            data={formattedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={timeFormatter}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', offset: -10 }}
            />
             <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
              label={{ value: 'V / A', angle: -90, position: 'insideRight', offset: -10 }}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" labelFormatter={(label, payload) => {
                 if (payload && payload.length > 0 && typeof label === 'number') {
                     return format(new Date(label), "PPpp")
                 }
                 return label;
              }} />}
            />
             <Legend verticalAlign="top" height={36} />
            <Line
              yAxisId="left"
              dataKey="power"
              type="monotone"
              stroke="var(--color-power)"
              strokeWidth={2}
              dot={false}
            />
            <Line
               yAxisId="right"
              dataKey="voltage"
              type="monotone"
              stroke="var(--color-voltage)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              dataKey="current"
              type="monotone"
              stroke="var(--color-current)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
         ) : (
            <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">No data for this period. Make sure your ESP32 is sending data.</p>
            </div>
        )}
      </CardContent>
    </Card>
  )
}

    