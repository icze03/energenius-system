'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wifi, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DiscoveredDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
}

interface DiscoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (device: {
    name: string;
    type: string;
    consumption: number;
    tuyaDeviceId: string; // FIX: now properly passed through
  }) => void;
}

export function DiscoveryDialog({ isOpen, onClose, onAddDevice }: DiscoveryDialogProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'error'>('idle');
  const [foundDevices, setFoundDevices] = useState<DiscoveredDevice[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  const startDiscovery = async () => {
    setStatus('scanning');
    setFoundDevices([]);
    setErrorMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await fetch('/api/tuya?action=discover');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reach Tuya API');
      }

      // Filter for smart plug categories: 'cz' = socket/outlet, 'pc' = power strip
      const smartPlugs: DiscoveredDevice[] = (data as any[]).filter(
        (d) =>
          d.category === 'cz' ||
          d.category === 'pc' ||
          d.name?.toLowerCase().includes('plug') ||
          d.name?.toLowerCase().includes('socket') ||
          d.name?.toLowerCase().includes('outlet')
      );

      setFoundDevices(smartPlugs);
      setStatus('found');
    } catch (error: any) {
      console.error('Discovery error:', error);
      setErrorMessage(error.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startDiscovery();
    } else {
      setStatus('idle');
    }
  }, [isOpen]);

  const handleLinkDevice = (device: DiscoveredDevice) => {
    // FIX: the Tuya device ID is now saved so future commands work correctly
    onAddDevice({
      name: device.name || 'Smart Plug',
      type: 'Smart Plug',
      consumption: 0,
      tuyaDeviceId: device.id,
    });
    toast({
      title: 'Device Linked',
      description: `${device.name} has been added to your devices.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Device Discovery
          </DialogTitle>
          <DialogDescription>
            Scanning your Tuya account for registered smart plugs.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center min-h-[200px]">
          {status === 'scanning' && (
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Wifi className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-medium animate-pulse">Searching your Tuya account...</p>
            </div>
          )}

          {status === 'found' && foundDevices.length > 0 && (
            <div className="w-full space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Smart Plugs Found ({foundDevices.length})
              </p>
              {foundDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <Wifi className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{device.name}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase h-4">
                          {device.category === 'cz' ? 'Smart Socket' : 'Smart Plug'}
                        </Badge>
                        <Badge
                          variant={device.online ? 'default' : 'secondary'}
                          className="text-[10px] h-4"
                        >
                          {device.online ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleLinkDevice(device)} variant="secondary">
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))}
            </div>
          )}

          {status === 'found' && foundDevices.length === 0 && (
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No smart plugs found</p>
              <p className="text-xs text-muted-foreground px-4">
                Make sure your plug is registered in the same Tuya IoT project as your API keys.
              </p>
              <Button onClick={startDiscovery} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Scan
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-destructive font-medium">Connection Error</p>
              <p className="text-xs text-muted-foreground px-4">{errorMessage}</p>
              <p className="text-xs text-muted-foreground px-4">
                Check that TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, and TUYA_BASE_URL are set correctly
                in your .env.local file.
              </p>
              <Button onClick={startDiscovery} variant="outline" size="sm" className="mt-2">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
