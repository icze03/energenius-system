
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { Trash2, Save, AlertTriangle } from 'lucide-react';
import type { Device } from '@/app/devices/page';
import { useToast } from '@/hooks/use-toast';


interface DeviceCardProps {
  device: Device;
  onRemove: (device: Device) => void;
  onUpdateDevice: (deviceId: string, updates: Partial<Device>) => void;
}

export function DeviceCard({ device, onRemove, onUpdateDevice }: DeviceCardProps) {
  const [status, setStatus] = useState<'online' | 'offline'>(device.status);
  const [startTime, setStartTime] = useState(device.schedule.start);
  const [endTime, setEndTime] = useState(device.schedule.end);
  const [threshold, setThreshold] = useState(device.threshold);
  const [isDirty, setIsDirty] = useState(false);
  const Icon = device.icon;
  const { toast } = useToast();

  // Sync with external changes to device prop
  useEffect(() => {
    setStatus(device.status);
    setStartTime(device.schedule.start);
    setEndTime(device.schedule.end);
    setThreshold(device.threshold);
    setIsDirty(false); // Reset dirty state when prop changes
  }, [device]);


  const handleStatusChange = (newStatus: boolean) => {
    setStatus(newStatus ? 'online' : 'offline');
    setIsDirty(true);
  }

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(e.target.value);
    setIsDirty(true);
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(e.target.value);
    setIsDirty(true);
  }
  
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThreshold(Number(e.target.value));
    setIsDirty(true);
  }

  const handleSaveChanges = () => {
    const updates: Partial<Device> = {
        status,
        schedule: { start: startTime, end: endTime },
    };
    if (threshold !== undefined) {
        updates.threshold = threshold;
    }
    
    onUpdateDevice(device.id, updates);
    setIsDirty(false);
    toast({
        title: "Device Saved",
        description: `Changes to "${device.name}" have been saved.`,
    })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {Icon && <Icon className="h-6 w-6 text-primary" />}
              <CardTitle>{device.name}</CardTitle>
            </div>
            <CardDescription>{device.type}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`switch-${device.name}`} className="text-sm">
              {status === 'online' ? 'On' : 'Off'}
            </Label>
            <Switch
              id={`switch-${device.name}`}
              checked={status === 'online'}
              onCheckedChange={handleStatusChange}
              aria-label={`Toggle ${device.name}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2 rounded-full', status === 'online' ? 'bg-primary' : 'bg-muted-foreground')}
            ></span>
            <span>{status === 'online' ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. Consumption</span>
          <span className="font-medium">{device.consumption} W</span>
        </div>
        <Separator />
        <div className="space-y-2">
            <h4 className="text-sm font-medium">Schedule</h4>
            <div className="flex items-center gap-4">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor={`start-time-${device.name}`}>From</Label>
                    <Input id={`start-time-${device.name}`} type="time" value={startTime} onChange={handleStartTimeChange} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor={`end-time-${device.name}`}>To</Label>
                    <Input id={`end-time-${device.name}`} type="time" value={endTime} onChange={handleEndTimeChange} />
                </div>
            </div>
        </div>
         <Separator />
         <div className="space-y-2">
            <div className="flex items-center justify-between">
                 <h4 className="text-sm font-medium">Automation</h4>
                 <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor={`threshold-${device.name}`}>Alert Threshold (kW)</Label>
                <Input id={`threshold-${device.name}`} type="number" placeholder="e.g. 1.5" value={threshold || ''} onChange={handleThresholdChange} step="0.1" />
                <p className="text-xs text-muted-foreground">Set a power limit in kilowatts to trigger an alert if the device's consumption exceeds this value.</p>
            </div>
        </div>
      </CardContent>
       <CardFooter className="mt-auto grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => onRemove(device)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
        <Button onClick={handleSaveChanges} disabled={!isDirty}>
            <Save className="mr-2 h-4 w-4" />
            Save
        </Button>
      </CardFooter>
    </Card>
  );
}
