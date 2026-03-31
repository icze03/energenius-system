
'use client';

import { useState, useEffect } from 'react';
import { ConsumptionChart } from "@/components/dashboard/consumption-chart"
import { SummaryCard } from "@/components/dashboard/summary-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Zap, Power, AlertTriangle, Info, PowerOff, Sigma, Clock, BellRing, Settings, CheckCircle, XCircle, Activity, Calendar, ToggleLeft, ToggleRight } from "lucide-react"
import { type SensorData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

type Alert = {
  id: string;
  type: 'Critical' | 'Warning' | 'Info';
  message: string;
  device: string;
  time: string;
  status: 'new' | 'resolved' | 'ignored';
}

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
  const [historyData, setHistoryData] = useState<TuyaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalConsumptionThreshold, setTotalConsumptionThreshold] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('1d'); // Default to 24 hours
  const [phpPerKwh, setPhpPerKwh] = useState(DEFAULT_PHP_PER_KWH);
  const [isControllingDevice, setIsControllingDevice] = useState(false);
  const [isPlugDeviceEnsured, setIsPlugDeviceEnsured] = useState(false);
  const { toast } = useToast();

  // Load threshold and rate from local storage on initial render
  useEffect(() => {
    const savedThreshold = localStorage.getItem('totalConsumptionThreshold');
    if (savedThreshold) {
      setTotalConsumptionThreshold(savedThreshold);
    }
    const savedRate = localStorage.getItem('phpPerKwh');
    if (savedRate) {
        setPhpPerKwh(parseFloat(savedRate));
    }
  }, []);

  const ensureSmartPlugDeviceExists = async (data: TuyaData) => {
    if (isPlugDeviceEnsured) return;

    const devicesRef = collection(db, 'devices');
    const q = query(devicesRef, where('name', '==', 'Smart Plug'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Device doesn't exist, so create it
        try {
            await addDoc(devicesRef, {
                name: 'Smart Plug',
                type: 'Smart Plug',
                consumption: data.power,
                status: data.switch_1 ? 'online' : 'offline',
                schedule: { start: '00:00', end: '23:59' },
                threshold: 1000, // A default threshold in watts
            });
            toast({
                title: 'Smart Plug Auto-Added',
                description: 'The Tuya smart plug has been added to your devices list.',
            });
        } catch (error) {
            console.error("Error auto-adding smart plug:", error);
        }
    }
    setIsPlugDeviceEnsured(true);
  };


  // Fetch data from the API route
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

        // After first successful fetch, ensure the device exists in Firestore
        if (data && !isPlugDeviceEnsured) {
          ensureSmartPlugDeviceExists(data);
        }

        setHistoryData(prev => {
          const now = new Date();
          const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
          // Add new data and filter out old data
          const updatedHistory = [...prev, data];
          return updatedHistory.filter(d => new Date(d.timestamp).getTime() > twentyFourHoursAgo);
        });

      } catch (error: any) {
        console.error("Error fetching Tuya data:", error.message);
        toast({
            variant: "destructive",
            title: "Connection Error",
            description: error.message || "Could not fetch data from the smart plug.",
        })
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 10000); // Fetch every 10 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, isPlugDeviceEnsured]);

    useEffect(() => {
        if (liveData) {
            generateAlerts(liveData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveData, totalConsumptionThreshold]);


  const generateAlerts = (reading: TuyaData) => {
    const newAlerts: Alert[] = [];
    
    // Global consumption threshold check
    const numericThreshold = parseFloat(totalConsumptionThreshold);
    if (!isNaN(numericThreshold) && reading.power > numericThreshold) {
        const alertId = `global-threshold-breach-${new Date(reading.timestamp).getTime()}`;
        const newAlert: Alert = {
            id: alertId,
            type: 'Critical',
            message: `Total consumption has exceeded the global limit: ${reading.power.toFixed(2)}W (limit: ${numericThreshold}W).`,
            device: 'Smart Plug',
            time: new Date(reading.timestamp).toLocaleTimeString(),
            status: 'new',
        };
       if (!alerts.some(a => a.id.startsWith('global-threshold-breach-') && (new Date().getTime() - new Date(a.time).getTime() < 60000))) {
            setAlerts(prev => [newAlert, ...prev].slice(0,10));
       }
    }
  }
  
  const getBadgeForAlert = (type: Alert['type']) => {
    switch (type) {
      case 'Critical':
        return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Critical</Badge>;
      case 'Warning':
        return <Badge variant="secondary" className="bg-yellow-500/80 text-black"><AlertTriangle className="mr-1 h-3 w-3" />Warning</Badge>;
      case 'Info':
        return <Badge className="bg-blue-500/80"><Clock className="mr-1 h-3 w-3" />Info</Badge>;
      default:
        return <Badge><Info className="mr-1 h-3 w-3" />Info</Badge>;
    }
  };

  const handleAlertAction = (alertId: string, status: 'resolved' | 'ignored') => {
    setAlerts(prevAlerts => prevAlerts.map(alert => 
      alert.id === alertId ? { ...alert, status } : alert
    ));
    toast({
        title: `Alert ${status}`,
        description: "The alert has been updated.",
    });
  }

  const handleSaveThreshold = () => {
    if (totalConsumptionThreshold === '' || isNaN(parseFloat(totalConsumptionThreshold))) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a valid number for the threshold in Watts.',
      });
      return;
    }
    localStorage.setItem('totalConsumptionThreshold', totalConsumptionThreshold);
    toast({
      title: 'Threshold Saved!',
      description: `Global consumption alert set to ${totalConsumptionThreshold} W.`,
    });
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

        const result = await response.json();
        if (result.success) {
            // Optimistically update the UI
            setLiveData(prev => prev ? { ...prev, switch_1: checked } : null);
            toast({
                title: `Device Turned ${command}`,
            });
        } else {
             throw new Error(result.error || 'Unknown error from API');
        }

    } catch (error: any) {
        console.error('Error toggling device:', error);
        toast({
            variant: 'destructive',
            title: 'Command Failed',
            description: error.message || 'Could not control the smart plug.',
        });
        // Revert optimistic update on failure
        setLiveData(prev => prev ? { ...prev, switch_1: !checked } : null);
    } finally {
        setIsControllingDevice(false);
    }
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'new');
  const estimatedCostToday = (liveData?.total_kwh || 0) * phpPerKwh;

  // Convert history for chart
  const chartData: SensorData[] = historyData.map((d, i) => ({
    id: String(i),
    deviceId: "Smart Plug",
    timestamp: new Date(d.timestamp),
    power: d.power,
    voltage: d.voltage,
    current: d.current
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Current Usage"
          value={liveData ? `${liveData.power.toFixed(2)} W` : 'N/A'}
          icon={Zap}
          description="Live from smart plug"
        />
        <SummaryCard
          title="Voltage"
          value={liveData ? `${liveData.voltage.toFixed(2)} V` : 'N/A'}
          icon={TrendingUp}
          description="Live voltage reading"
        />
         <SummaryCard
          title="Current"
          value={liveData ? `${liveData.current.toFixed(3)} A` : 'N/A'}
          icon={Sigma}
          description="Live current reading"
        />
        <SummaryCard
          title="Total Energy Today"
          value={liveData ? `${liveData.total_kwh.toFixed(2)} kWh` : 'N/A'}
          icon={Activity}
          description={`Est. cost: ₱${estimatedCostToday.toFixed(2)}`}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <ConsumptionChart 
              data={chartData} 
              loading={loading}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
            />
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Power className="mr-2"/> Device Control</CardTitle>
                    <CardDescription>
                        Toggle the smart plug on or off directly from the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center space-x-4 p-6">
                    <ToggleLeft className={cn("text-muted-foreground", liveData?.switch_1 && "text-primary")}/>
                    <Switch
                        checked={liveData?.switch_1 || false}
                        onCheckedChange={handleDeviceToggle}
                        disabled={isControllingDevice || !liveData}
                        aria-label="Toggle Smart Plug"
                    />
                     <ToggleRight className={cn("text-muted-foreground", !liveData?.switch_1 && "text-muted-foreground/50")}/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><BellRing className="mr-2"/> Alert System</CardTitle>
                    <CardDescription>
                    Set a power threshold to get an alert if consumption exceeds the limit.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className='flex items-center space-x-2'>
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
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : activeAlerts.length > 0 ? (
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
                        <CheckCircle className="mr-1 h-3 w-3"/>
                        Resolve
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleAlertAction(alert.id, 'ignored')}>
                        <XCircle className="mr-1 h-3 w-3"/>
                        Ignore
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
  )
}
