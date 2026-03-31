
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Device } from '@/app/devices/page';


interface AddDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (device: Omit<Device, 'id' | 'icon' | 'status' | 'schedule'>) => void;
}

export function AddDeviceDialog({ isOpen, onClose, onAddDevice }: AddDeviceDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [consumption, setConsumption] = useState('');

  const handleSubmit = () => {
    // For non-smart-plugs, all fields are required.
    // For smart plugs, consumption is not required as it's dynamic.
    if (name && type && (consumption || type === 'Smart Plug')) {
      onAddDevice({
        name,
        type,
        consumption: type === 'Smart Plug' ? 0 : Number(consumption),
      });
      onClose();
      setName('');
      setType('');
      setConsumption('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Device</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Device Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Office Printer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Device Type</Label>
            <Select onValueChange={setType} value={type}>
                <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Smart Plug">Smart Plug</SelectItem>
                    <SelectItem value="Lighting System">Lighting System</SelectItem>
                    <SelectItem value="Climate Control">Climate Control</SelectItem>
                    <SelectItem value="AV Equipment">AV Equipment</SelectItem>
                    <SelectItem value="IT Infrastructure">IT Infrastructure</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {type !== 'Smart Plug' ? (
            <div className="space-y-2">
                <Label htmlFor="consumption">Est. Power Consumption (W)</Label>
                <Input id="consumption" type="number" value={consumption} onChange={(e) => setConsumption(e.target.value)} placeholder="e.g., 50" />
                 <p className="text-xs text-muted-foreground">For devices without live monitoring, enter an estimated wattage.</p>
            </div>
          ) : (
             <div className="space-y-2 rounded-md border bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                    Power consumption for Smart Plugs is determined automatically from live data and does not need to be entered manually.
                </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Add Device</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
