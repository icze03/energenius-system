import { RealtimeData } from '@/components/live-data/realtime-data';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LiveDataPage() {
  return (
    <div className="space-y-6">
      <Card>
            <CardHeader>
                <CardTitle>Historical Data Analysis</CardTitle>
                <CardDescription>Analyze sensor readings by day, week, or month.</CardDescription>
            </CardHeader>
      </Card>
      <RealtimeData />
    </div>
  );
}
