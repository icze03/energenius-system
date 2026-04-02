'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, RefreshCw, Zap } from 'lucide-react';
import { collection, addDoc, Timestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Device } from '@/app/devices/page';


interface DeviceSimulatorCardProps {
    devices: Device[];
}

export function DeviceSimulatorCard({ devices }: DeviceSimulatorCardProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // On component mount, check localStorage to restore simulation state
    const savedIsSimulating = localStorage.getItem('isSimulating') === 'true';
    const savedDeviceId = localStorage.getItem('selectedSimulatedDeviceId');
    
    if (savedIsSimulating && savedDeviceId) {
      setSelectedDeviceId(savedDeviceId);
      setIsSimulating(true);
    }
  }, []);
  
  const devicesToSimulate = (selectedDeviceId === 'all-active' 
    ? devices.filter(d => d.status === 'online') 
    : devices.filter(d => d.id === selectedDeviceId && d.status === 'online'));
  
  const selectedDeviceName = selectedDeviceId === 'all-active' 
    ? 'All Active Devices' 
    : devices.find(d => d.id === selectedDeviceId)?.name;

  const pushSimulatedData = async () => {
    if (devicesToSimulate.length === 0) {
        // If no devices are left to simulate (e.g., all turned off), stop the simulation.
        if (isSimulating) {
            stopSimulation();
            toast({
                title: 'Simulation Stopped',
                description: 'All selected devices are now offline.',
            });
        }
        return;
    }

    try {
        const batch = writeBatch(db);

        for (const device of devicesToSimulate) {
             if (device.status !== 'online') continue; // double-check status

            const baseConsumption = device.consumption;
            const baseVoltage = 220;
            const voltageFluctuation = (Math.random() - 0.5) * 5; // +/- 2.5V
            const voltage = baseVoltage + voltageFluctuation;
            
            const baseCurrent = baseConsumption / baseVoltage;
            const currentNoise = (Math.random() - 0.5) * (baseCurrent * 0.1); // Noise is 10% of base
            const current = Math.max(0, baseCurrent + currentNoise); // Ensure current is not negative

            const power = voltage * current;

            const reading = {
                deviceId: device.name,
                timestamp: Timestamp.now(),
                voltage: parseFloat(voltage.toFixed(2)),
                current: parseFloat(current.toFixed(2)),
                power: parseFloat(power.toFixed(2)),
            };
            
            const docRef = doc(collection(db, 'sensor-data'));
            batch.set(docRef, reading);
        }
        await batch.commit();

    } catch (error) {
      console.error('Error pushing simulated data:', error);
      toast({
        variant: 'destructive',
        title: 'Simulation Error',
        description: 'Could not push data. Stopping simulation.',
      });
      stopSimulation();
    }
  };


  const startSimulation = async () => {
    if (!selectedDeviceId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a device to simulate.'});
        return;
    };
    if (devicesToSimulate.length === 0) {
        toast({ variant: 'destructive', title: 'No Online Devices', description: 'The selected device(s) are offline. Turn them on to start simulating.'});
        return;
    }
    
    setIsSimulating(true);
    localStorage.setItem('isSimulating', 'true');
    localStorage.setItem('selectedSimulatedDeviceId', selectedDeviceId!);

    toast({
        title: 'Simulation Started',
        description: `Now pushing data for ${selectedDeviceName}.`,
    });

    // Push the first data point immediately
    await pushSimulatedData();
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    localStorage.removeItem('isSimulating');
    localStorage.removeItem('selectedSimulatedDeviceId');

    if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
    }

    toast({
        title: 'Simulation Stopped',
        description: 'No longer pushing data.',
    });
  };

  const resetData = async () => {
    if (isSimulating) {
        stopSimulation();
    }
    const devicesToReset = selectedDeviceId === 'all-active' 
        ? devices
        : devices.filter(d => d.id === selectedDeviceId);

    if (devicesToReset.length === 0 && selectedDeviceId !== 'all-active') {
        toast({
            variant: 'destructive',
            title: 'No device selected',
            description: 'Please select a device or group to reset its data.',
        });
        return;
    }
    try {
        const batch = writeBatch(db);
        
        let sensorQuery;
        if (selectedDeviceId === 'all-active' || devices.length === 0) {
            sensorQuery = query(collection(db, "sensor-data"));
        } else {
            const deviceNamesToReset = devicesToReset.map(d => d.name);
             if (deviceNamesToReset.length === 0) {
                 toast({ title: 'No devices to reset', description: 'No devices match the current selection.'});
                 return;
            }
            sensorQuery = query(collection(db, "sensor-data"), where("deviceId", "in", deviceNamesToReset));
        }

        const sensorSnapshot = await getDocs(sensorQuery);
        
        if (sensorSnapshot.empty) {
            toast({
                title: 'No Data to Reset',
                description: `No simulated data found for the selection.`,
            });
            return;
        }

        sensorSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        toast({
            title: 'Data Reset Successful',
            description: `All simulated sensor data for the selection has been removed.`,
        });
    } catch (error) {
        console.error("Error resetting data: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not reset simulated data.',
        });
    }
  }


  useEffect(() => {
    if (isSimulating) {
      simulationInterval.current = setInterval(pushSimulatedData, 5000);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating, selectedDeviceId, devices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Simulator</CardTitle>
        <CardDescription>
          Generate sample data for testing without physical hardware.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select onValueChange={setSelectedDeviceId} value={selectedDeviceId || ''} disabled={isSimulating}>
            <SelectTrigger>
                <SelectValue placeholder="Select a device to simulate..." />
            </SelectTrigger>
            <SelectContent>
                {devices.length > 0 ? (
                    <>
                        <SelectItem value="all-active">All Active Devices</SelectItem>
                        {devices.map(device => (
                            <SelectItem key={device.id} value={device.id}>
                                {device.name} ({device.consumption}W)
                            </SelectItem>
                        ))}
                    </>
                ) : (
                    <div className="p-4 text-sm text-muted-foreground">Please add a device first.</div>
                )}
            </SelectContent>
        </Select>
        <div className="flex items-center space-x-4 rounded-md border p-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Status</p>
                <p className="text-sm text-muted-foreground">
                    {isSimulating ? `Simulating ${selectedDeviceName || 'device'}` : 'Idle'}
                </p>
            </div>
            {isSimulating ? (
                 <Badge variant="outline" className="text-primary border-primary">Running</Badge>
            ) : (
                <Badge variant="secondary">Idle</Badge>
            )}
        </div>

        <div className="grid grid-cols-2 gap-4">
             {isSimulating ? (
                <Button onClick={stopSimulation} variant="destructive">
                    <Square className="mr-2" />
                    Stop
                </Button>
            ) : (
                 <Button onClick={startSimulation} disabled={!selectedDeviceId}>
                    <Play className="mr-2" />
                    Start
                </Button>
            )}
            <Button onClick={resetData} variant="outline" disabled={isSimulating}>
                <RefreshCw className="mr-2" />
                Reset Data
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}