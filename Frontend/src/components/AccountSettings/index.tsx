import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAccountStore } from '../../stores';
import { toast } from 'sonner';
import { Edit, Save, X } from 'lucide-react';

const AccountSettings: React.FC = () => {
  const { currentAccount, updateAccountDetails, isLoading } = useAccountStore();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  if (!currentAccount) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Please select an account first</p>
      </Card>
    );
  }
  
  const handleEdit = () => {
    setFormData({
      name: currentAccount.name,
      description: currentAccount.description || ''
    });
    setEditing(true);
  };
  
  const handleCancel = () => {
    setEditing(false);
    setFormData({ name: '', description: '' });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Account name is required');
      return;
    }
    
    try {
      await updateAccountDetails(
        currentAccount.id, 
        formData.name.trim(), 
        formData.description.trim()
      );
      toast.success('Account settings updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update account settings:', error);
      toast.error('Failed to update account settings');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold">Account Settings</h4>
          {!editing && (
            <Button variant="outline" onClick={handleEdit} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>
        
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name*</Label>
              <Input
                id="accountName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter account name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountDescription">Description</Label>
              <Textarea
                id="accountDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter account description (optional)"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button type="submit" disabled={isLoading} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Name</Label>
              <p className="text-sm mt-1">{currentAccount.name}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
              <p className="text-sm mt-1 capitalize">{currentAccount.type}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">
                {currentAccount.description || 'No description provided'}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="text-sm mt-1">
                {new Date(currentAccount.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        )}
      </Card>
      
      {/* Account Information Card */}
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900">
        <h5 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-300">Account Information</h5>
        <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
          <p>• Account settings affect how your account appears in team management and billing.</p>
          <p>• Changes to the account name will be reflected across all team members.</p>
          <p>• Account type cannot be changed after creation. Contact support if you need to upgrade.</p>
        </div>
      </Card>
    </div>
  );
};

export default AccountSettings;
