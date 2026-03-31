
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LucideIcon } from 'lucide-react';
import React from 'react';

export interface InfoDialogProps {
    title: string;
    content: React.ReactNode;
    icon: LucideIcon;
}

export function InfoDialog({
  title,
  content,
  icon: Icon,
  children,
}: InfoDialogProps & { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer w-full h-full">{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary"/>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
