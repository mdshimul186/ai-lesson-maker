'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Key, 
  Plus, 
  Copy, 
  MoreVertical, 
  Eye, 
  EyeOff,
  Trash2,
  Shield,
  Calendar
} from 'lucide-react';
import { request } from '@/utils/request';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
}

interface APIKeyWithToken extends APIKey {
  key: string;
}

export default function APIKeyManagement() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);
  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await request<{ api_keys: APIKey[] }>({
        url: '/api/api-keys/',
        method: 'GET'
      });
      setApiKeys(response.api_keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };
  const createAPIKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please provide a name for the API key');
      return;
    }

    try {
      setCreating(true);
      const payload: any = { name: newKeyName.trim() };
      if (expiresInDays && expiresInDays > 0) {
        payload.expires_in_days = expiresInDays;
      }

      const newApiKey = await request<APIKeyWithToken>({
        url: '/api/api-keys/',
        method: 'POST',
        data: payload
      });
      
      setCreatedKey(newApiKey.key);
      setShowCreatedKey(true);
      setApiKeys(prev => [newApiKey, ...prev]);
      setShowCreateDialog(false);
      setNewKeyName('');
      setExpiresInDays(undefined);
      
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };
  const revokeAPIKey = async (keyId: string) => {
    try {
      await request({
        url: `/api/api-keys/${keyId}/revoke`,
        method: 'PUT'
      });
      setApiKeys(prev => 
        prev.map(key => 
          key.id === keyId ? { ...key, is_active: false } : key
        )
      );
      toast.success('API key revoked successfully');
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };
  const deleteAPIKey = async (keyId: string) => {
    try {
      await request({
        url: `/api/api-keys/${keyId}`,
        method: 'DELETE'
      });
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast.success('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., My App Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expiresIn">Expires in days (optional)</Label>
                <Input
                  id="expiresIn"
                  type="number"
                  placeholder="e.g., 90"
                  min="1"
                  max="365"
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={createAPIKey} disabled={creating}>
                  {creating ? 'Creating...' : 'Create API Key'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display newly created key */}
      {createdKey && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Your new API key has been created</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm">
                  {showCreatedKey ? createdKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreatedKey(!showCreatedKey)}
                >
                  {showCreatedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCreatedKey(null)}
              >
                Got it
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Your API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading API keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys found. Create your first API key to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {apiKey.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {!apiKey.is_active ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : isExpired(apiKey.expires_at) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(apiKey.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apiKey.expires_at ? (
                        <span className={isExpired(apiKey.expires_at) ? 'text-destructive' : ''}>
                          {formatDate(apiKey.expires_at)}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {apiKey.is_active && !isExpired(apiKey.expires_at) && (
                            <DropdownMenuItem onClick={() => revokeAPIKey(apiKey.id)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Revoke
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => deleteAPIKey(apiKey.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Using API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the request headers:
            </p>
            <code className="block p-3 bg-muted rounded text-sm">
              curl -H "X-API-Key: your_api_key_here" https://api.yourapp.com/api/...
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">Security</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Keep your API keys secure and never share them publicly</li>
              <li>• Use different API keys for different applications</li>
              <li>• Set expiration dates for better security</li>
              <li>• Revoke compromised keys immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
