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
import { AddDeviceDialog } from '@/components/devices/add-device-dialog';
import { DiscoveryDialog } from '@/components/devices/discovery-dialog';
import {
  Lightbulb,
  Snowflake,
  Tv,
  Server,
  PlusCircle,
  Laptop,
  PlugZap,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

export interface Device {
  id: string;
  name: string;
  type: string;
  icon?: LucideIcon;
  status: 'online' | 'offline';
  consumption: number;
  schedule: { start: string; end: string };
  threshold?: number;
  tuyaDeviceId?: string; // FIX: added so commands target the right plug
}

export type DeviceDocument = Omit<Device, 'id' | 'icon'>;

const getIconForType = (type: string): LucideIcon => {
  switch (type) {
    case 'Smart Plug':
      return PlugZap;
    case 'Lighting System':
      return Lightbulb;
    case 'Climate Control':
      return Snowflake;
    case 'AV Equipment':
      return Tv;
    case 'IT Infrastructure':
      return Server;
    default:
      return Laptop;
  }
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'devices'), orderBy('name'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const devicesData: Device[] = snapshot.docs.map((doc) => {
          const data = doc.data() as DeviceDocument;
          return { ...data, id: doc.id, icon: getIconForType(data.type) };
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
    newDevice: Omit<Device, 'id' | 'icon' | 'status' | 'schedule'>
  ) => {
    try {
      const deviceData: DeviceDocument = {
        ...newDevice,
        status: 'online',
        schedule: { start: '09:00', end: '18:00' },
        threshold: newDevice.consumption ? newDevice.consumption * 1.5 : 1000,
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

  const groupedDevices = devices.reduce(
    (acc, device) => {
      (acc[device.type] = acc[device.type] || []).push(device);
      return acc;
    },
    {} as Record<string, Device[]>
  );

  const deviceTypes = Object.keys(groupedDevices);

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Device Control Center</CardTitle>
            <CardDescription>
              Discover your Tuya smart plugs or add other office equipment manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button onClick={() => setIsDiscoveryOpen(true)} className="bg-primary hover:bg-primary/90">
              <Wifi className="mr-2 h-4 w-4" />
              Discover Smart Plugs
            </Button>
            <Button onClick={() => setIsAddDeviceDialogOpen(true)} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Manual Add
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        ) : deviceTypes.length > 0 ? (
          <Accordion type="multiple" defaultValue={deviceTypes} className="w-full space-y-4">
            {deviceTypes.map((type) => (
              <AccordionItem key={type} value={type} className="border-none">
                <Card>
                  <AccordionTrigger className="p-6 text-lg font-medium">
                    {type} ({groupedDevices[type].length})
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {groupedDevices[type].map((device) => (
                        <DeviceCard
                          key={device.id}
                          device={device}
                          onRemove={openConfirmationDialog}
                          onUpdateDevice={handleUpdateDevice}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
            <div className="text-center">
              <Wifi className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold">No Devices Connected</h3>
              <p className="text-muted-foreground mt-2">
                Start by discovering your smart plugs or adding a device manually.
              </p>
            </div>
          </div>
        )}

        <AddDeviceDialog
          isOpen={isAddDeviceDialogOpen}
          onClose={() => setIsAddDeviceDialogOpen(false)}
          onAddDevice={handleAddDevice}
        />

        <DiscoveryDialog
          isOpen={isDiscoveryOpen}
          onClose={() => setIsDiscoveryOpen(false)}
          onAddDevice={handleAddDevice}
        />
      </div>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deviceToRemove?.name}&quot; from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDevice}
              className="bg-destructive text-destructive-foreground"
            >
              Delete Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
