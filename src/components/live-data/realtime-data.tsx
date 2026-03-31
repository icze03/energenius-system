
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type SensorData } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format } from 'date-fns';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import { SummaryCard } from '../dashboard/summary-card';

type TimeRange = '1h' | '1d' | '1w' | '1m';

export function RealtimeData() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [totalKwhForRange, setTotalKwhForRange] = useState(0);
  const [avgVoltage, setAvgVoltage] = useState(0);
  const [avgCurrent, setAvgCurrent] = useState(0);


  useEffect(() => {
    setLoading(true);

    const getStartDate = (range: TimeRange) => {
        const now = new Date();
        switch (range) {
             case '1h':
                const oneHourAgo = new Date(now);
                oneHourAgo.setHours(now.getHours() - 1);
                return oneHourAgo;
            case '1d':
                const oneDayAgo = new Date(now);
                oneDayAgo.setDate(now.getDate() - 1);
                return oneDayAgo;
            case '1w':
                const oneWeekAgo = new Date(now);
                oneWeekAgo.setDate(now.getDate() - 7);
                return oneWeekAgo;
            case '1m':
                const oneMonthAgo = new Date(now);
                oneMonthAgo.setMonth(now.getMonth() - 1);
                return oneMonthAgo;
        }
    };
    
    const startDate = getStartDate(timeRange);

    const q = query(
        collection(db, 'sensor-data'), 
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sensorData: SensorData[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        if (docData.timestamp) { // Ensure timestamp exists
            sensorData.push({
            id: doc.id,
            deviceId: docData.deviceId,
            timestamp: docData.timestamp.toDate(),
            voltage: docData.voltage,
            current: docData.current,
            power: docData.power,
            });
        }
      });
      setData(sensorData);
      setTotalKwhForRange(calculateKwh(sensorData));
      if (sensorData.length > 0) {
        setAvgVoltage(sensorData.reduce((acc, d) => acc + d.voltage, 0) / sensorData.length);
        setAvgCurrent(sensorData.reduce((acc, d) => acc + d.current, 0) / sensorData.length);
      } else {
        setAvgVoltage(0);
        setAvgCurrent(0);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching realtime data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange]);

   const calculateKwh = (readings: SensorData[]) => {
    if (readings.length < 2) return 0;
    const sortedReadings = [...readings].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
    let totalKwh = 0;
    for (let i = 1; i < sortedReadings.length; i++) {
        const timeDiffHours = (sortedReadings[i].timestamp.getTime() - sortedReadings[i - 1].timestamp.getTime()) / 3600000;
        const avgPowerKw = (sortedReadings[i].power + sortedReadings[i - 1].power) / 2 / 1000;
        totalKwh += avgPowerKw * timeDiffHours;
    }
    return totalKwh;
  };

  const timeFormatter = (tick: number | string) => {
    if (typeof tick !== 'number') return String(tick);
    
    const date = new Date(tick);
     switch (timeRange) {
        case '1h':
        case '1d':
            return format(date, "HH:mm");
        case '1w':
        case '1m':
            return format(date, "MMM d");
        default:
            return format(date, "HH:mm");
    }
  };

  const formattedData = data.map(item => ({
    ...item,
    time: item.timestamp.getTime(),
  }));

  const handleTimeRangeChange = (value: TimeRange | '') => {
    if (value) {
      setTimeRange(value);
    }
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
        case '1h': return 'Last Hour';
        case '1d': return 'Last 24 Hours';
        case '1w': return 'Last 7 Days';
        case '1m': return 'Last 30 Days';
    }
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
             <SummaryCard
                title="Total Energy Used"
                value={`${totalKwhForRange.toFixed(2)} kWh`}
                icon={Activity}
                description={`Cumulative for the ${getTimeRangeLabel()}`}
                info={{
                    title: 'About Total Energy Used',
                    icon: Activity,
                    content: 'This represents the total amount of electrical energy consumed over the selected time period, measured in kilowatt-hours (kWh). It is calculated by integrating the power readings, providing a cumulative measure of usage rather than an instantaneous one.',
                }}
            />
            <SummaryCard
                title="Average Voltage"
                value={`${avgVoltage.toFixed(2)} V`}
                icon={TrendingUp}
                description={`Average for the ${getTimeRangeLabel()}`}
                info={{
                    title: 'About Average Voltage',
                    icon: TrendingUp,
                    content: 'This is the average voltage reading over the selected time period. Consistent voltage is important for device health. Significant deviations can indicate grid issues.',
                }}
            />
            <SummaryCard
                title="Average Current"
                value={`${avgCurrent.toFixed(2)} A`}
                icon={Zap}
                description={`Average for the ${getTimeRangeLabel()}`}
                info={{
                    title: 'About Average Current',
                    icon: Zap,
                    content: 'This is the average electrical current (amperage) drawn over the selected time period. It is a key component, along with voltage, in determining power consumption.',
                }}
            />
        </div>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Consumption Over Time</CardTitle>
                    <CardDescription>A multi-axis chart showing power, voltage, and current.</CardDescription>
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
                    <p className="text-muted-foreground">Loading chart data...</p>
                </div>
            ) : data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="time"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={timeFormatter}
                    />
                    <YAxis yAxisId="left" label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'V / A', angle: -90, position: 'insideRight' }} />

                    <Tooltip labelFormatter={(label) => {
                        if (typeof label === 'number') {
                            return format(new Date(label), "PPpp");
                        }
                        return label;
                    }}/>
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="power" stroke="hsl(var(--chart-1))" name="Power (W)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="voltage" stroke="hsl(var(--chart-2))" name="Voltage (V)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="current" stroke="hsl(var(--chart-4))" name="Current (A)" dot={false} />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No data for this period. Make sure your ESP32 is sending data.</p>
                </div>
            )}
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Readings Log</CardTitle>
          <CardDescription>A detailed table of the most recent sensor data received.</CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Loading recent readings...</p>
            </div>
          ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Voltage (V)</TableHead>
                <TableHead>Current (A)</TableHead>
                <TableHead>Power (W)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data].reverse().slice(0, 20).map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell>{new Date(reading.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{reading.deviceId}</TableCell>
                  <TableCell>{reading.voltage.toFixed(2)}</TableCell>
                  <TableCell>{reading.current.toFixed(2)}</TableCell>
                  <TableCell>{reading.power.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           ) : (
            <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">No recent readings to display.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
