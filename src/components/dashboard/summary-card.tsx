
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { InfoDialog, type InfoDialogProps } from "./info-dialog";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  info?: InfoDialogProps;
}

export function SummaryCard({ title, value, icon: Icon, description, info }: SummaryCardProps) {
  const cardContent = (
     <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )

  if (info) {
    return (
        <InfoDialog {...info}>
            {cardContent}
        </InfoDialog>
    )
  }

  return cardContent;
}
