
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, Loader2, Lightbulb, BarChart, Clock, AlertTriangle, Power, Ghost, DollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { Device } from '@/app/devices/page';
import { type SensorData } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

type Recommendation = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof ICONS;
};

const ICONS: { [key: string]: LucideIcon } = {
  Lightbulb, BarChart, Clock, AlertTriangle, Power, Ghost, DollarSign
};

export function RuleBasedRecommendations() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [latestReading, setLatestReading] = useState<SensorData | null>(null);
  const [isRateSet, setIsRateSet] = useState(false);

  useEffect(() => {
    // Check if the rate is set in local storage
    const savedRate = localStorage.getItem('phpPerKwh');
    setIsRateSet(!!savedRate);

    let devicesLoaded = false;
    let sensorDataLoaded = false;

    const checkIfAllDataIsLoaded = () => {
      if (devicesLoaded && sensorDataLoaded) {
        setLoading(false);
        setInitialDataLoaded(true);
      }
    };

    const devicesQuery = query(collection(db, "devices"));
    const startOfTwoDaysAgo = new Date();
    startOfTwoDaysAgo.setDate(startOfTwoDaysAgo.getDate() - 2);

    const sensorQuery = query(
      collection(db, 'sensor-data'),
      where('timestamp', '>=', startOfTwoDaysAgo),
      orderBy('timestamp', 'desc')
    );
    
    const unsubDevices = onSnapshot(devicesQuery, (snapshot) => {
      const fetchedDevices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Device));
      setDevices(fetchedDevices);
      devicesLoaded = true;
      checkIfAllDataIsLoaded();
    }, () => {
        devicesLoaded = true;
        checkIfAllDataIsLoaded();
    });

    const unsubSensorData = onSnapshot(sensorQuery, (snapshot) => {
      const fetchedSensorData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              ...data,
              id: doc.id,
              timestamp: (data.timestamp as Timestamp).toDate()
          } as SensorData
      });
      setSensorData(fetchedSensorData);
      if (fetchedSensorData.length > 0) {
        setLatestReading(fetchedSensorData[0]); // it's in descending order
      }
      sensorDataLoaded = true;
      checkIfAllDataIsLoaded();
    }, () => {
        sensorDataLoaded = true;
        checkIfAllDataIsLoaded();
    });

    return () => {
      unsubDevices();
      unsubSensorData();
    };
  }, []);

  const handleGenerate = () => {
    setGenerating(true);

    const newRecommendations: Recommendation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

    const todaysReadings = sensorData.filter(d => d.timestamp >= startOfToday);
    const yesterdaysReadings = sensorData.filter(d => d.timestamp >= startOfYesterday && d.timestamp < startOfToday);
    
    const calculateKwh = (readings: SensorData[]) => {
        if (readings.length < 2) return 0;
        readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        let totalKwh = 0;
        for (let i = 1; i < readings.length; i++) {
            const timeDiffHours = (readings[i].timestamp.getTime() - readings[i - 1].timestamp.getTime()) / 3600000;
            const avgPowerKw = (readings[i].power + readings[i - 1].power) / 2 / 1000;
            totalKwh += avgPowerKw * timeDiffHours;
        }
        return totalKwh;
    };
    
    const todaysTotalKwh = calculateKwh(todaysReadings);
    const yesterdaysTotalKwh = calculateKwh(yesterdaysReadings);

    // Rule 0: Billing Rate not set
    if (!isRateSet) {
        newRecommendations.push({
            id: 'set-billing-rate',
            title: 'Set Your Electricity Rate',
            description: `To get accurate cost estimates, please go to Settings > General Settings and enter the current price per kWh from your electricity bill. This will make your dashboard cost tracking much more precise.`,
            icon: 'DollarSign'
        });
    }

    // Rule 1: Phantom Load
    const allDevicesOff = devices.every(d => d.status === 'offline');
    if (allDevicesOff && latestReading && latestReading.power > 10) { // 10W threshold for phantom
        newRecommendations.push({
            id: 'phantom-load',
            title: 'Phantom Power Detected',
            description: `All your registered devices are off, but we're still detecting ${latestReading.power.toFixed(1)} watts of power being used. This "phantom load" could be from devices in standby mode or other unregistered equipment. Consider unplugging non-essential electronics to reduce waste.`,
            icon: 'Ghost'
        });
    }

    // Rule 2: High Energy Usage
    if (todaysTotalKwh > yesterdaysTotalKwh * 1.2 && yesterdaysTotalKwh > 0) {
        const increasePercent = ((todaysTotalKwh / yesterdaysTotalKwh) - 1) * 100;
        newRecommendations.push({
            id: 'high-usage',
            title: 'Check Your Daily Energy Use',
            description: `Your energy consumption so far today (${todaysTotalKwh.toFixed(2)} kWh) is ${increasePercent.toFixed(0)}% higher than all of yesterday (${yesterdaysTotalKwh.toFixed(2)} kWh). Check if any high-power devices were left running unexpectedly.`,
            icon: 'BarChart'
        });
    }
    
    // Rule 3: Peak Hour
    const hourlyUsage: { [hour: number]: { totalPower: number; count: number } } = {};
    [...todaysReadings, ...yesterdaysReadings].forEach(r => {
        const hour = r.timestamp.getHours();
        if (!hourlyUsage[hour]) {
            hourlyUsage[hour] = { totalPower: 0, count: 0 };
        }
        hourlyUsage[hour].totalPower += r.power;
        hourlyUsage[hour].count++;
    });

    if (Object.keys(hourlyUsage).length > 1) {
        const peakHourData = Object.entries(hourlyUsage).map(([hour, data]) => ({
            hour: Number(hour),
            avgPower: data.totalPower / data.count,
        })).reduce((a, b) => a.avgPower > b.avgPower ? a : b);

        const peakHour = peakHourData.hour;
        const timeFormat = (h: number) => h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`;
        
        newRecommendations.push({
            id: 'peak-hour',
            title: `Identify Your Peak Energy Hour: ${timeFormat(peakHour)} - ${timeFormat(peakHour+1)}`,
            description: `Your office uses the most energy between ${timeFormat(peakHour)} and ${timeFormat(peakHour+1)}. Try to shift heavy tasks like printing or running machinery away from this time to reduce costs and strain on the grid.`,
            icon: 'Clock'
        });
    }

    // Rule 4: Device Inefficiency
    const deviceTypes = devices.reduce((acc, device) => {
        if (!acc[device.type]) acc[device.type] = [];
        acc[device.type].push(device);
        return acc;
    }, {} as Record<string, Device[]>);

    for (const type in deviceTypes) {
        if (deviceTypes[type].length > 1) {
            const avgConsumption = deviceTypes[type].reduce((sum, d) => sum + d.consumption, 0) / deviceTypes[type].length;
            deviceTypes[type].forEach(device => {
                if (device.consumption > avgConsumption * 1.5) { // 50% more than average
                    newRecommendations.push({
                        id: `inefficient-${device.id}`,
                        title: `Device Uses More Energy: ${device.name}`,
                        description: `The "${device.name}" uses ${device.consumption}W, which is significantly more than other ${type} devices in your office. If it's an older model, consider upgrading to a more energy-efficient one to save on electricity costs.`,
                        icon: 'AlertTriangle'
                    });
                }
            });
        }
    }

    setTimeout(() => {
        setRecommendations(newRecommendations);
        setGenerating(false);
    }, 500); // Simulate processing time
  };

  const renderRecommendations = () => {
    if (generating) {
       return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
        )
    }

    if (recommendations === null) {
        return null;
    }

    if (recommendations.length === 0) {
      return (
        <Card className="flex h-48 items-center justify-center border-dashed">
          <div className="text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No specific recommendations found.</p>
            <p className="text-xs text-muted-foreground">Your system appears to be running efficiently based on current data.</p>
          </div>
        </Card>
      )
    }

    return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(rec => {
            const Icon = ICONS[rec.icon] || Lightbulb;
            return (
                <Card key={rec.id} className="p-4 flex flex-col">
                <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold">{rec.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-2 flex-grow">{rec.description}</p>
                </Card>
            )
          })}
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Usage Report</CardTitle>
          <CardDescription>
            Click the button to analyze your recent energy data and generate a set of personalized, actionable recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={loading || generating || !initialDataLoaded}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
             : generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             : <BrainCircuit className="mr-2 h-4 w-4" />}
            {loading ? 'Loading Energy Data...' : generating ? 'Generating...' : 'Generate Recommendations'}
          </Button>
        </CardContent>
      </Card>

      {renderRecommendations()}
    </div>
  );
}
