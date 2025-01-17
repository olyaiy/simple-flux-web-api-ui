import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ImageDisplayProps {
  result: string | null;
}

export function ImageDisplay({ result }: ImageDisplayProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Generated Image</CardTitle>
        <CardDescription>Your AI-generated artwork will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <img 
            src={result} 
            alt="Generated image"
            className="rounded-lg w-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
            <p className="text-muted-foreground">No image generated yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 