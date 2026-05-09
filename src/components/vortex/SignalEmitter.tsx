import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SignalEmitterProps {
  onEmit: (input: string) => void;
}

export function SignalEmitter({ onEmit }: SignalEmitterProps) {
  const [input, setInput] = useState('');

  const handleEmit = () => {
    if (!input.trim()) return;
    onEmit(input.trim());
    setInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Emitter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter signal content (text, thread, or temporal data)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[120px]"
        />
        <Button 
          onClick={handleEmit} 
          className="w-full"
          disabled={!input.trim()}
        >
          Emit Isotopic Signal
        </Button>
      </CardContent>
    </Card>
  );
}
