
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Send } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Submit Report
    </Button>
  );
}

export function ReportIssueForm() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { user } = useAuth();
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (issue.length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }
    
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to submit a report.',
        });
        return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'reports'), {
        description: issue,
        createdAt: serverTimestamp(),
        status: 'new',
        userId: user.uid,
      });

      toast({
        title: 'Success!',
        description: 'Report sent! Thank you for your feedback.',
      });
      setIssue('');
      formRef.current?.reset();
    } catch (e: any) {
      console.error('Error submitting report:', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit report. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="issue">Describe your issue</Label>
        <Textarea
          id="issue"
          name="issue"
          placeholder="Please provide as much detail as possible..."
          required
          rows={5}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
        />
        {error && (
           <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <SubmitButton pending={loading} />
    </form>
  );
}
