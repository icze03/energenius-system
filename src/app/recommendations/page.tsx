import { RuleBasedRecommendations } from '@/components/recommendations/rule-based-recommendations';

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
              Generate actionable insights based on your office's energy usage patterns.
          </p>
      </div>
      <RuleBasedRecommendations />
    </div>
  );
}
