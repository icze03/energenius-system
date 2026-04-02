'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { Trash2, Save, AlertTriangle, PlugZap, Loader2 } from 'lucide-react';
import type { Device } from '@/app/devices/page';
import { useToast } from '@/hooks/use-toast';

interface DeviceCardProps {
  device: Device;
  onRemove: (device: Device) => void;
  onUpdateDevice: (deviceId: string, updates: Partial<Device>) => void;
}

export function DeviceCard({ device, onRemove, onUpdateDevice }: DeviceCardProps) {
  const [isOn, setIsOn] = useState(device.status === 'online');
  const [isSending, setIsSending] = useState(false);
  const [startTime, setStartTime] = useState(device.schedule.start);
  const [endTime, setEndTime] = useState(device.schedule.end);
  const [threshold, setThreshold] = useState(device.threshold);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsOn(device.status === 'online');
    setStartTime(device.schedule.start);
    setEndTime(device.schedule.end);
    setThreshold(device.threshold);
    setIsDirty(false);
  }, [device]);

  const handleToggle = async (checked: boolean) => {
    setIsSending(true);
    const command = checked ? 'ON' : 'OFF';
    const targetDeviceId = device.tuyaDeviceId;

    try {
      const response = await fetch('/api/tuya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, targetDeviceId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send command');
      }

      // Update status in Firestore to reflect new state
      await onUpdateDevice(device.id, { status: checked ? 'online' : 'offline' });
      setIsOn(checked);
      toast({ title: `Plug turned ${command}`, description: device.name });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Command Failed',
        description: error.message || 'Could not control the smart plug.',
      });
      // Revert UI
      setIsOn(!checked);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveChanges = () => {
    const updates: Partial<Device> = {
      schedule: { start: startTime, end: endTime },
    };
    if (threshold !== undefined) {
      updates.threshold = threshold;
    }
    onUpdateDevice(device.id, updates);
    setIsDirty(false);
    toast({ title: 'Settings Saved', description: `"${device.name}" updated.` });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlugZap className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>{device.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-mono text-muted-foreground/70">
                {device.tuyaDeviceId ?? 'No Tuya ID'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isSending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Label htmlFor={`switch-${device.id}`} className="text-sm">
              {isOn ? 'On' : 'Off'}
            </Label>
            <Switch
              id={`switch-${device.id}`}
              checked={isOn}
              onCheckedChange={handleToggle}
              disabled={isSending || !device.tuyaDeviceId}
              aria-label={`Toggle ${device.name}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', isOn ? 'bg-green-500' : 'bg-muted-foreground')} />
            <span>{isOn ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Schedule</h4>
          <div className="flex items-center gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`start-${device.id}`}>From</Label>
              <Input
                id={`start-${device.id}`}
                type="time"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setIsDirty(true); }}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`end-${device.id}`}>To</Label>
              <Input
                id={`end-${device.id}`}
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setIsDirty(true); }}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Alert Threshold</h4>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={`threshold-${device.id}`}>Max Power (W)</Label>
            <Input
              id={`threshold-${device.id}`}
              type="number"
              placeholder="e.g. 2000"
              value={threshold || ''}
              onChange={(e) => { setThreshold(Number(e.target.value)); setIsDirty(true); }}
              step="50"
            />
            <p className="text-xs text-muted-foreground">
              Trigger an alert when this plug exceeds the set wattage.
            </p>
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