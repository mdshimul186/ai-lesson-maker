import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Video, Play, CheckCircle } from 'lucide-react';

const CreditUsageGuide: React.FC = () => {
  return (
    <Card className="p-6 border border-border bg-background dark:bg-card/95">
      <div className="flex items-center space-x-2 mb-4">
        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h4 className="text-lg font-semibold text-foreground">Understanding Credit Usage</h4>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Learn how credits work and how to get the most value from your AI Lesson Maker account.
      </p>
      
      {/* Credit System */}
      <div className="mb-6">
        <h5 className="font-semibold mb-4 text-foreground">Credit System</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <h6 className="font-semibold mb-2 text-blue-900 dark:text-blue-300">1 Credit = 1 Scene</h6>
            <p className="text-sm text-muted-foreground mb-3">
              Each scene in your lesson uses exactly one credit. A scene typically includes:
            </p>
            <ul className="text-sm space-y-1 mb-3 text-blue-800 dark:text-blue-300">
              <li>• A slide with visual content</li>
              <li>• Narration for that slide</li>
              <li>• Animations and transitions</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Example: A 10-scene lesson will require 10 credits.
            </p>
          </Card>
          
          <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <h6 className="font-semibold mb-2 text-green-900 dark:text-green-300">Scene Length Flexibility</h6>
            <p className="text-sm text-muted-foreground mb-3">
              Scene length is flexible and can vary based on:
            </p>
            <ul className="text-sm space-y-1 mb-3 text-green-800 dark:text-green-300">
              <li>• The amount of content in each scene</li>
              <li>• The narration speed setting</li>
              <li>• Your preferred pacing</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Scene duration typically ranges from 10-30 seconds.
            </p>
          </Card>
        </div>
      </div>
      
      {/* How to Create Scenes */}
      <div className="mb-6">
        <h5 className="font-semibold mb-4 text-foreground">How to Create Scenes</h5>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-2">
              <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h6 className="font-medium text-foreground">1. Plan Your Lesson</h6>
              <p className="text-sm text-muted-foreground">
                Outline the key points you want to cover in your lesson and estimate how many scenes you'll need.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-2">
              <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h6 className="font-medium text-foreground">2. Create Scenes</h6>
              <p className="text-sm text-muted-foreground">
                When creating your lesson, break down your content into logical segments or slides. Each segment will become a scene.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-2">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h6 className="font-medium text-foreground">3. Generate Video</h6>
              <p className="text-sm text-muted-foreground">
                Credits are only deducted when you finalize and generate your video. You can edit your scenes without using additional credits.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recommended Scene Counts */}
      <div className="mb-6">
        <h5 className="font-semibold mb-4 text-foreground">Recommended Scene Counts</h5>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-muted/50 dark:bg-card/80 text-center border border-border">
            <div className="text-2xl font-bold mb-1 text-foreground">3-5</div>
            <div className="text-sm text-muted-foreground mb-3">scenes</div>
            <Badge variant="outline" className="mb-3 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400">Short Lessons</Badge>
            <p className="text-xs text-muted-foreground">
              Quick concepts, definitions, or simple explanations
            </p>
          </Card>
          
          <Card className="p-4 bg-muted/50 dark:bg-card/80 text-center border border-border">
            <div className="text-2xl font-bold mb-1 text-foreground">6-10</div>
            <div className="text-sm text-muted-foreground mb-3">scenes</div>
            <Badge variant="outline" className="mb-3 text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">Standard Lessons</Badge>
            <p className="text-xs text-muted-foreground">
              Complete topics with examples and detailed explanations
            </p>
          </Card>
          
          <Card className="p-4 bg-muted/50 dark:bg-card/80 text-center border border-border">
            <div className="text-2xl font-bold mb-1 text-foreground">11-20</div>
            <div className="text-sm text-muted-foreground mb-3">scenes</div>
            <Badge variant="outline" className="mb-3 text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400">Comprehensive Lessons</Badge>
            <p className="text-xs text-muted-foreground">
              In-depth tutorials or complex subject matter
            </p>
          </Card>
        </div>
      </div>
      
      <Separator />
      
      <p className="text-sm text-muted-foreground text-center mt-4">
        Still have questions about credits? Check the FAQ tab or contact our support team.
      </p>
    </Card>
  );
};

export default CreditUsageGuide;
