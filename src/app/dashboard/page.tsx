'use client';

import { useState, useEffect, useRef } from 'react';
import { ConsumptionChart } from "@/components/dashboard/consumption-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Power, AlertTriangle, Info, Sigma, Clock, BellRing, Settings, CheckCircle, XCircle, Activity, ToggleLeft, ToggleRight } from "lucide-react";
import { type SensorData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

type Alert = {
  id: string;
  type: 'Critical' | 'Warning' | 'Info';
  message: string;
  device: string;
  time: string;
  status: 'new' | 'resolved' | 'ignored';
};

export type TimeRange = '1h' | '1d' | '1w' | '1m';

const DEFAULT_PHP_PER_KWH = 11;

interface TuyaData {
  power: number;
  voltage: number;
  current: number;
  total_kwh: number;
  switch_1: boolean;
  timestamp: string;
}

export default function DashboardPage() {
  const [liveData, setLiveData] = useState<TuyaData | null>(null);
  const [chartData, setChartData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalConsumptionThreshold, setTotalConsumptionThreshold] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [phpPerKwh, setPhpPerKwh] = useState(DEFAULT_PHP_PER_KWH);
  const [isControllingDevice, setIsControllingDevice] = useState(false);
  const alertsRef = useRef(alerts);
  const { toast } = useToast();

  // Keep ref in sync so generateAlerts doesn't close over stale alerts
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedThreshold = localStorage.getItem('totalConsumptionThreshold');
    if (savedThreshold) setTotalConsumptionThreshold(savedThreshold);
    const savedRate = localStorage.getItem('phpPerKwh');
    if (savedRate) setPhpPerKwh(parseFloat(savedRate));
  }, []);

  // ── Firestore real-time chart listener ──────────────────────────────────────
  useEffect(() => {
    setChartLoading(true);

    const getStartDate = (range: TimeRange) => {
      const now = new Date();
      switch (range) {
        case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
        case '1d': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '1w': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '1m': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    };

    const q = query(
      collection(db, 'sensor-data'),
      where('timestamp', '>=', getStartDate(timeRange)),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SensorData[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.timestamp) {
          data.push({
            id: doc.id,
            deviceId: d.deviceId ?? 'Smart Plug',
            timestamp: d.timestamp.toDate(),
            voltage: d.voltage,
            current: d.current,
            power: d.power,
          });
        }
      });
      setChartData(data);
      setChartLoading(false);
    }, (error) => {
      console.error('Chart data error:', error);
      setChartLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange]);

  // ── Tuya live poll + write to Firestore ─────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/tuya');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }
        const data: TuyaData = await response.json();
        setLiveData(data);
        generateAlerts(data);

        // Write reading to Firestore so it persists across refreshes
        await addDoc(collection(db, 'sensor-data'), {
          deviceId: 'Smart Plug',
          timestamp: Timestamp.now(),
          voltage: data.voltage,
          current: data.current,
          power: data.power,
          total_kwh: data.total_kwh,
        });

      } catch (error: any) {
        console.error('Error fetching Tuya data:', error.message);
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: error.message || 'Could not fetch data from the smart plug.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // ── Alert generation ─────────────────────────────────────────────────────────
  const generateAlerts = (reading: TuyaData) => {
    const numericThreshold = parseFloat(totalConsumptionThreshold);
    if (!isNaN(numericThreshold) && numericThreshold > 0 && reading.power > numericThreshold) {
      const now = Date.now();
      // Throttle: only one alert per minute
      const recentBreach = alertsRef.current.some(
        (a) => a.id.startsWith('threshold-') && now - parseInt(a.id.split('-')[1]) < 60000
      );
      if (!recentBreach) {
        const newAlert: Alert = {
          id: `threshold-${now}`,
          type: 'Critical',
          message: `Power exceeded limit: ${reading.power.toFixed(1)}W (limit: ${numericThreshold}W)`,
          device: 'Smart Plug',
          time: new Date().toLocaleTimeString(),
          status: 'new',
        };
        setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
      }
    }
  };

  const getBadgeForAlert = (type: Alert['type']) => {
    switch (type) {
      case 'Critical': return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Critical</Badge>;
      case 'Warning': return <Badge variant="secondary" className="bg-yellow-500/80 text-black"><AlertTriangle className="mr-1 h-3 w-3" />Warning</Badge>;
      case 'Info': return <Badge className="bg-blue-500/80"><Clock className="mr-1 h-3 w-3" />Info</Badge>;
      default: return <Badge><Info className="mr-1 h-3 w-3" />Info</Badge>;
    }
  };

  const handleAlertAction = (alertId: string, status: 'resolved' | 'ignored') => {
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status } : a));
    toast({ title: `Alert ${status}` });
  };

  const handleSaveThreshold = () => {
    if (totalConsumptionThreshold === '' || isNaN(parseFloat(totalConsumptionThreshold))) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid number in Watts.' });
      return;
    }
    localStorage.setItem('totalConsumptionThreshold', totalConsumptionThreshold);
    toast({ title: 'Threshold Saved!', description: `Alert set to ${totalConsumptionThreshold} W.` });
  };

  const handleDeviceToggle = async (checked: boolean) => {
    setIsControllingDevice(true);
    const command = checked ? 'ON' : 'OFF';
    try {
      const response = await fetch('/api/tuya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send command');
      }
      setLiveData((prev) => prev ? { ...prev, switch_1: checked } : null);
      toast({ title: `Plug turned ${command}` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Command Failed', description: error.message });
      setLiveData((prev) => prev ? { ...prev, switch_1: !checked } : null);
    } finally {
      setIsControllingDevice(false);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'new');
  const estimatedCostToday = (liveData?.total_kwh || 0) * phpPerKwh;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Current Usage" value={liveData ? `${liveData.power.toFixed(2)} W` : 'N/A'} icon={Zap} description="Live from smart plug" />
        <SummaryCard title="Voltage" value={liveData ? `${liveData.voltage.toFixed(2)} V` : 'N/A'} icon={TrendingUp} description="Live voltage reading" />
        <SummaryCard title="Current" value={liveData ? `${liveData.current.toFixed(3)} A` : 'N/A'} icon={Sigma} description="Live current reading" />
        <SummaryCard title="Total Energy Today" value={liveData ? `${liveData.total_kwh.toFixed(2)} kWh` : 'N/A'} icon={Activity} description={`Est. cost: ₱${estimatedCostToday.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConsumptionChart
            data={chartData}
            loading={chartLoading}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Power className="mr-2" /> Device Control</CardTitle>
              <CardDescription>Toggle the smart plug on or off directly from the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center space-x-4 p-6">
              <ToggleLeft className={cn('text-muted-foreground', liveData?.switch_1 && 'text-primary')} />
              <Switch
                checked={liveData?.switch_1 || false}
                onCheckedChange={handleDeviceToggle}
                disabled={isControllingDevice || !liveData}
                aria-label="Toggle Smart Plug"
              />
              <ToggleRight className={cn('text-muted-foreground', !liveData?.switch_1 && 'text-muted-foreground/50')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><BellRing className="mr-2" /> Alert System</CardTitle>
              <CardDescription>Set a power threshold to get an alert if consumption exceeds the limit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="e.g., 1000"
                  value={totalConsumptionThreshold}
                  onChange={(e) => setTotalConsumptionThreshold(e.target.value)}
                />
                <span className="text-muted-foreground">W</span>
              </div>
              <Button onClick={handleSaveThreshold} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Set Global Alert
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader>
        <CardContent>
          {activeAlerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.message}</TableCell>
                    <TableCell>{alert.device}</TableCell>
                    <TableCell>{alert.time}</TableCell>
                    <TableCell>{getBadgeForAlert(alert.type)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleAlertAction(alert.id, 'resolved')}>
                        <CheckCircle className="mr-1 h-3 w-3" />Resolve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleAlertAction(alert.id, 'ignored')}>
                        <XCircle className="mr-1 h-3 w-3" />Ignore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-muted-foreground">No new alerts to display.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}