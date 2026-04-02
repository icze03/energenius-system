'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { DeviceCard } from '@/components/devices/device-card';
import { DiscoveryDialog } from '@/components/devices/discovery-dialog';
import { PlugZap, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export interface Device {
  id: string;
  name: string;
  type: string;
  icon?: LucideIcon;
  status: 'online' | 'offline';
  consumption: number;
  schedule: { start: string; end: string };
  threshold?: number;
  tuyaDeviceId?: string;
}

export type DeviceDocument = Omit<Device, 'id' | 'icon'>;

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'devices'), orderBy('name'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const devicesData: Device[] = snapshot.docs.map((d) => {
          const data = d.data() as DeviceDocument;
          return { ...data, id: d.id, icon: PlugZap };
        });
        setDevices(devicesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching devices:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddDevice = async (
    newDevice: { name: string; type: string; consumption: number; tuyaDeviceId: string }
  ) => {
    try {
      const deviceData: DeviceDocument = {
        ...newDevice,
        status: 'online',
        schedule: { start: '00:00', end: '23:59' },
        threshold: 2000,
      };
      await addDoc(collection(db, 'devices'), deviceData);
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const openConfirmationDialog = (device: Device) => {
    setDeviceToRemove(device);
    setIsConfirmDialogOpen(true);
  };

  const handleRemoveDevice = async () => {
    if (deviceToRemove) {
      try {
        await deleteDoc(doc(db, 'devices', deviceToRemove.id));
      } catch (error) {
        console.error('Error removing device:', error);
      }
      setDeviceToRemove(null);
    }
    setIsConfirmDialogOpen(false);
  };

  const handleUpdateDevice = async (deviceId: string, updates: Partial<Device>) => {
    try {
      await updateDoc(doc(db, 'devices', deviceId), updates);
    } catch (error) {
      console.error('Error updating device:', error);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Smart Plug Control</CardTitle>
            <CardDescription>
              Discover and manage your Tuya smart plugs. Use the toggle on each card to turn plugs on or off remotely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsDiscoveryOpen(true)} className="bg-primary hover:bg-primary/90">
              <Wifi className="mr-2 h-4 w-4" />
              Discover Smart Plugs
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        ) : devices.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onRemove={openConfirmationDialog}
                onUpdateDevice={handleUpdateDevice}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
            <div className="text-center">
              <Wifi className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold">No Smart Plugs Connected</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Click "Discover Smart Plugs" to scan your Tuya account and link your devices.
              </p>
            </div>
          </div>
        )}

        <DiscoveryDialog
          isOpen={isDiscoveryOpen}
          onClose={() => setIsDiscoveryOpen(false)}
          onAddDevice={handleAddDevice}
        />
      </div>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this plug?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deviceToRemove?.name}&quot; from your dashboard. You can re-add it anytime via discovery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDevice}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}